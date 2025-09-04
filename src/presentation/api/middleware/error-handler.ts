import { Context, Next } from 'hono';
import { ApiContext, createErrorResponse } from '../types';

// Error types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// Error logger
export function logError(error: Error, context: any = {}) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    name: error.name,
    context: {
      ...context,
      userAgent: context.userAgent,
      ip: context.ip,
      url: context.url,
      method: context.method,
      requestId: context.requestId,
    },
  };

  // In production, this would send to external logging service
  console.error('Error:', JSON.stringify(errorLog, null, 2));
  
  // TODO: Send to external monitoring service (Sentry, LogFlare, etc.)
  // await sendToMonitoringService(errorLog);
}

// Error handling middleware
export function errorHandler() {
  return async (c: Context<ApiContext>, next: Next) => {
    try {
      await next();
    } catch (error) {
      const requestId = c.get('requestId');
      
      // Log error with context
      logError(error as Error, {
        requestId,
        method: c.req.method,
        url: c.req.url,
        userAgent: c.req.header('User-Agent'),
        ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      });

      // Handle known application errors
      if (error instanceof AppError) {
        return c.json(
          createErrorResponse(
            error.code,
            error.message,
            requestId
          ),
          error.statusCode
        );
      }

      // Handle validation errors from Zod
      if (error instanceof Error && error.name === 'ZodError') {
        return c.json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid request data',
            requestId
          ),
          400
        );
      }

      // Handle unknown errors
      const isDevelopment = c.env.NODE_ENV === 'development';
      
      return c.json(
        createErrorResponse(
          'INTERNAL_SERVER_ERROR',
          isDevelopment ? (error as Error).message : 'An unexpected error occurred',
          requestId
        ),
        500
      );
    }
  };
}