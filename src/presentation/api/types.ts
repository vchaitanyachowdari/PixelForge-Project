import { Hono } from 'hono';
import { z } from 'zod';

// User interface from Mocha users service
export interface User {
  id: string;
  email: string;
  google_user_data?: {
    name?: string;
    picture?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown; // Allow additional properties from the auth service
}

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
  INTERNAL_API_KEY?: string;
}

// Extended Hono context
export type ApiContext = {
  Bindings: Env;
  Variables: {
    user?: User;
    requestId?: string;
    sanitizedBody?: unknown;
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