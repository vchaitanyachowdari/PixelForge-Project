import { Context, Next } from 'hono';
import { ApiContext, createErrorResponse } from '../types';
import { RateLimitError } from './error-handler';

// Rate limiting store (simple in-memory for Workers)
class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  
  get(key: string): { count: number; resetTime: number } | null {
    return this.store.get(key) || null;
  }
  
  set(key: string, value: { count: number; resetTime: number }): void {
    this.store.set(key, value);
  }
  
  delete(key: string): void {
    this.store.delete(key);
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }
}

// Rate limiting middleware
export function rateLimit(options: {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (c: Context<ApiContext>) => string;
}) {
  const store = new RateLimitStore();
  
  return async (c: Context<ApiContext>, next: Next) => {
    const { maxRequests, windowMs, keyGenerator } = options;
    
    // Generate rate limit key (IP + user ID if available)
    const defaultKeyGen = (ctx: Context<ApiContext>) => {
      const ip = ctx.req.header('CF-Connecting-IP') || 
                 ctx.req.header('X-Forwarded-For') || 
                 'unknown';
      const user = ctx.get('user');
      return user ? `${ip}:${user.id}` : ip;
    };
    
    const key = keyGenerator ? keyGenerator(c) : defaultKeyGen(c);
    const now = Date.now();
    const resetTime = now + windowMs;
    
    // Cleanup expired entries
    store.cleanup();
    
    const current = store.get(key);
    
    if (!current || current.resetTime <= now) {
      // First request or window expired
      store.set(key, { count: 1, resetTime });
    } else if (current.count >= maxRequests) {
      // Rate limit exceeded
      throw new RateLimitError(`Rate limit exceeded. Max ${maxRequests} requests per ${windowMs}ms`);
    } else {
      // Increment counter
      store.set(key, { count: current.count + 1, resetTime: current.resetTime });
    }
    
    // Add rate limit headers
    const remaining = Math.max(0, maxRequests - (store.get(key)?.count || 0));
    const resetTimeSeconds = Math.ceil((store.get(key)?.resetTime || now) / 1000);
    
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetTimeSeconds.toString());
    
    await next();
  };
}

// Input sanitization middleware
export function sanitizeInput() {
  return async (c: Context<ApiContext>, next: Next) => {
    // Basic input sanitization for common XSS patterns
    const sanitizeString = (str: string): string => {
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
    };
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };
    
    // Sanitize request body if it exists
    if (c.req.header('content-type')?.includes('application/json')) {
      try {
        const body = await c.req.json();
        // Store sanitized body for later use
        c.set('sanitizedBody', sanitizeObject(body));
      } catch (error) {
        // Invalid JSON - let validation middleware handle it
      }
    }
    
    await next();
  };
}

// Security headers middleware
export function securityHeaders() {
  return async (c: Context<ApiContext>, next: Next) => {
    await next();
    
    // Security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // CSP header for API responses
    c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
    
    // Remove server information
    c.header('Server', 'PixelForge-API');
  };
}

// Request size limiter
export function requestSizeLimit(maxSizeBytes: number = 10 * 1024 * 1024) { // 10MB default
  return async (c: Context<ApiContext>, next: Next) => {
    const contentLength = c.req.header('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return c.json(
        createErrorResponse(
          'REQUEST_TOO_LARGE',
          `Request size exceeds maximum allowed size of ${maxSizeBytes} bytes`
        ),
        413
      );
    }
    
    await next();
  };
}

// CORS security middleware (more restrictive than the basic one)
export function corsSecure(allowedOrigins: string[] = []) {
  return async (c: Context<ApiContext>, next: Next) => {
    const origin = c.req.header('origin');
    const isProduction = c.env.NODE_ENV === 'production';
    
    if (isProduction && origin && !allowedOrigins.includes(origin)) {
      return c.json(
        createErrorResponse(
          'CORS_ORIGIN_NOT_ALLOWED',
          'Origin not allowed by CORS policy'
        ),
        403
      );
    }
    
    await next();
  };
}

// API key validation middleware (for external integrations)
export function validateApiKey() {
  return async (c: Context<ApiContext>, next: Next) => {
    const path = c.req.path;
    
    // Skip API key validation for public endpoints
    const publicEndpoints = ['/health', '/info', '/auth/oauth/google/redirect_url'];
    if (publicEndpoints.some(endpoint => path.endsWith(endpoint))) {
      await next();
      return;
    }
    
    const apiKey = c.req.header('X-API-Key');
    const authHeader = c.req.header('Authorization');
    
    // If no API key and no auth header, this might be a user-authenticated request
    if (!apiKey && !authHeader) {
      await next();
      return;
    }
    
    // If API key is provided, validate it
    if (apiKey) {
      // TODO: Implement proper API key validation
      // const isValidApiKey = await validateApiKeyFromDatabase(apiKey);
      const isValidApiKey = apiKey === c.env.INTERNAL_API_KEY;
      
      if (!isValidApiKey) {
        return c.json(
          createErrorResponse(
            'INVALID_API_KEY',
            'Invalid API key provided'
          ),
          401
        );
      }
    }
    
    await next();
  };
}