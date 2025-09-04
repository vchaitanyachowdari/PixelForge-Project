// Middleware exports
export * from './error-handler';
export * from './logging';
export * from './security';
export * from './validation';

// Combined middleware configurations
import { errorHandler } from './error-handler';
import { requestLogger, performanceMonitor, metricsCollector } from './logging';
import { rateLimit, securityHeaders, requestSizeLimit, sanitizeInput } from './security';
import { validateContentType } from './validation';

export const productionMiddleware = [
  errorHandler(),
  securityHeaders(),
  requestSizeLimit(),
  sanitizeInput(),
  validateContentType(),
  requestLogger(),
  performanceMonitor(),
  metricsCollector(),
];

export const developmentMiddleware = [
  errorHandler(),
  requestLogger(),
  performanceMonitor(2000), // Higher threshold for development
  metricsCollector(),
];

export const apiRateLimit = rateLimit({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export const strictApiRateLimit = rateLimit({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
});