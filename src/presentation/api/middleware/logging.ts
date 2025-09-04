import { Context, Next } from 'hono';
import { ApiContext } from '../types';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// Logger interface
export interface ILogger {
  error(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  info(message: string, data?: any): void;
  debug(message: string, data?: any): void;
}

// Console logger implementation
export class ConsoleLogger implements ILogger {
  constructor(private minLevel: LogLevel = LogLevel.INFO) {}

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    return levels.indexOf(level) <= levels.indexOf(this.minLevel);
  }

  private formatLog(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    };
    
    return JSON.stringify(logEntry);
  }

  error(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatLog(LogLevel.ERROR, message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(LogLevel.WARN, message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatLog(LogLevel.INFO, message, data));
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatLog(LogLevel.DEBUG, message, data));
    }
  }
}

// Request logging middleware
export function requestLogger(logger: ILogger = new ConsoleLogger()) {
  return async (c: Context<ApiContext>, next: Next) => {
    const startTime = Date.now();
    const requestId = c.get('requestId');
    
    // Log incoming request
    logger.info('Incoming request', {
      requestId,
      method: c.req.method,
      url: c.req.url,
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      timestamp: new Date().toISOString(),
    });

    await next();

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log response
    const statusCode = c.res.status;
    const logLevel = statusCode >= 500 ? LogLevel.ERROR : 
                    statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    logger[logLevel]('Request completed', {
      requestId,
      method: c.req.method,
      url: c.req.url,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
    });
  };
}

// Performance monitoring middleware
export function performanceMonitor(threshold: number = 1000) {
  return async (c: Context<ApiContext>, next: Next) => {
    const startTime = Date.now();
    
    await next();
    
    const duration = Date.now() - startTime;
    const requestId = c.get('requestId');
    
    if (duration > threshold) {
      console.warn('Slow request detected', {
        requestId,
        method: c.req.method,
        url: c.req.url,
        duration,
        threshold,
      });
    }
    
    // Add performance headers
    c.header('X-Response-Time', `${duration}ms`);
  };
}

// Health metrics collector
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, number> = new Map();
  
  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }
  
  increment(metric: string, value: number = 1): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }
  
  getMetric(metric: string): number {
    return this.metrics.get(metric) || 0;
  }
  
  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
  
  reset(): void {
    this.metrics.clear();
  }
}

// Metrics middleware
export function metricsCollector() {
  const collector = MetricsCollector.getInstance();
  
  return async (c: Context<ApiContext>, next: Next) => {
    const startTime = Date.now();
    
    collector.increment('requests.total');
    collector.increment(`requests.method.${c.req.method.toLowerCase()}`);
    
    await next();
    
    const duration = Date.now() - startTime;
    const statusCode = c.res.status;
    
    collector.increment(`responses.status.${statusCode}`);
    collector.increment('responses.total');
    
    if (statusCode >= 400) {
      collector.increment('responses.errors');
    }
    
    // Track response times (simplified - in production use proper histograms)
    if (duration < 100) collector.increment('responses.fast');
    else if (duration < 500) collector.increment('responses.medium');
    else collector.increment('responses.slow');
  };
}