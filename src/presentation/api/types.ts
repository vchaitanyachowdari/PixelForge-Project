import { Hono } from 'hono';
import { z } from 'zod';

// Environment bindings interface
export interface Env {
  DB: D1Database;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  OPENAI_API_KEY: string;
  GOOGLE_CLOUD_PROJECT_ID: string;
  GOOGLE_CLOUD_LOCATION: string;
  NODE_ENV: string;
  APP_VERSION: string;
}

// Extended Hono context
export type ApiContext = {
  Bindings: Env;
  Variables: {
    user?: any;
    requestId?: string;
  };
};

// Base API response schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string(),
  requestId: z.string().optional(),
});

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
};

// Error response helper
export const createErrorResponse = (
  error: string,
  message?: string,
  requestId?: string
): ApiResponse => ({
  success: false,
  error,
  message,
  timestamp: new Date().toISOString(),
  requestId,
});

// Success response helper
export const createSuccessResponse = <T>(
  data?: T,
  message?: string,
  requestId?: string
): ApiResponse<T> => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString(),
  requestId,
});

// Route interface
export interface IApiRoute {
  path: string;
  app: Hono<ApiContext>;
}