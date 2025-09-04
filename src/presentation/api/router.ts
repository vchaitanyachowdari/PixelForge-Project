import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ApiContext, createSuccessResponse, createErrorResponse } from './types';

// Import route modules
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import imageRoutes from './routes/images';
import walletRoutes from './routes/wallet';

export function createApiRouter() {
  const app = new Hono<ApiContext>();

  // CORS middleware
  app.use('*', cors({
    origin: (origin) => {
      // Allow all origins in development, specific origins in production
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://pixelforge.app',
        'https://staging.pixelforge.app'
      ];
      
      if (!origin) return true; // Allow requests with no origin (mobile apps, etc.)
      return allowedOrigins.includes(origin);
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // Request ID middleware
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);
    await next();
  });

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json(createSuccessResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: c.env.APP_VERSION || '1.0.0',
      environment: c.env.NODE_ENV || 'development',
    }, 'Service is healthy'));
  });

  // API info endpoint
  app.get('/info', (c) => {
    return c.json(createSuccessResponse({
      name: 'PixelForge API',
      version: c.env.APP_VERSION || '1.0.0',
      environment: c.env.NODE_ENV || 'development',
      endpoints: [
        'GET /api/health',
        'GET /api/info',
        'GET /api/auth/oauth/google/redirect_url',
        'POST /api/auth/sessions',
        'POST /api/auth/logout',
        'GET /api/users/me',
        'PUT /api/users/me',
        'POST /api/images/generate',
        'GET /api/images',
        'GET /api/wallet/balance',
        'GET /api/wallet/transactions',
        'POST /api/wallet/topup',
      ],
    }, 'API information'));
  });

  // Mount route modules
  app.route(authRoutes.path, authRoutes.app);
  app.route(userRoutes.path, userRoutes.app);
  app.route(imageRoutes.path, imageRoutes.app);
  app.route(walletRoutes.path, walletRoutes.app);

  // Global error handler
  app.onError((err, c) => {
    console.error('API Error:', err);
    
    return c.json(
      createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        c.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
        c.get('requestId')
      ),
      500
    );
  });

  // 404 handler
  app.notFound((c) => {
    return c.json(
      createErrorResponse(
        'ENDPOINT_NOT_FOUND',
        `Endpoint ${c.req.method} ${c.req.path} not found`,
        c.get('requestId')
      ),
      404
    );
  });

  return app;
}