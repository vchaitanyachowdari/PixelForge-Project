import { createApiRouter } from '../presentation/api/router';
import { errorHandler } from '../presentation/api/middleware/error-handler';
import { requestLogger, performanceMonitor, metricsCollector } from '../presentation/api/middleware/logging';
import { rateLimit, securityHeaders, requestSizeLimit, sanitizeInput } from '../presentation/api/middleware/security';

// Create the main application
const app = createApiRouter();

// Apply global middleware in order
app.use('*', errorHandler());
app.use('*', securityHeaders());
app.use('*', requestSizeLimit(10 * 1024 * 1024)); // 10MB limit
app.use('*', sanitizeInput());
app.use('*', requestLogger());
app.use('*', performanceMonitor(1000)); // 1 second threshold
app.use('*', metricsCollector());

// Apply rate limiting to API endpoints
app.use('/api/*', rateLimit({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
}));

// Mount API routes under /api prefix
const apiApp = createApiRouter();
app.route('/api', apiApp);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'PixelForge API',
    version: c.env.APP_VERSION || '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    documentation: '/api/info',
  });
});

// Export the app as default
export default app;
