import { Context, Next } from 'hono';
import { z } from 'zod';
import { ApiContext, createErrorResponse } from '../types';
import { ValidationError } from './error-handler';

// Enhanced validation middleware
export function validateRequest<T extends z.ZodType>(schema: T, source: 'body' | 'query' | 'params' = 'body') {
  return async (c: Context<ApiContext>, next: Next) => {
    try {
      let data: unknown;

      switch (source) {
        case 'body':
          data = await c.req.json();
          break;
        case 'query':
          data = c.req.query();
          break;
        case 'params':
          data = c.req.param();
          break;
        default:
          throw new ValidationError('Invalid validation source');
      }

      // Validate data against schema
      const validationResult = schema.safeParse(data);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        return c.json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Request validation failed',
            c.get('requestId')
          ).data = { errors },
          400
        );
      }

      // Store validated data in context
      c.set(`validated${source.charAt(0).toUpperCase() + source.slice(1)}`, validationResult.data);

      await next();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return c.json(
          createErrorResponse(
            'INVALID_JSON',
            'Invalid JSON in request body',
            c.get('requestId')
          ),
          400
        );
      }
      throw error;
    }
  };
}

// Common validation schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// Validate pagination parameters
export function validatePagination() {
  return validateRequest(PaginationSchema, 'query');
}

// Validate ID parameters
export function validateIdParam() {
  return validateRequest(IdParamSchema, 'params');
}

// Content type validation
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return async (c: Context<ApiContext>, next: Next) => {
    const contentType = c.req.header('content-type');
    
    if (c.req.method !== 'GET' && c.req.method !== 'DELETE') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        return c.json(
          createErrorResponse(
            'INVALID_CONTENT_TYPE',
            `Content-Type must be one of: ${allowedTypes.join(', ')}`,
            c.get('requestId')
          ),
          415
        );
      }
    }

    await next();
  };
}

// File upload validation
export function validateFileUpload(options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
} = {}) {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'], required = false } = options;

  return async (c: Context<ApiContext>, next: Next) => {
    const contentType = c.req.header('content-type');

    if (contentType?.includes('multipart/form-data')) {
      // Handle file upload validation
      // Note: Cloudflare Workers have limited support for multipart/form-data
      // Consider using a different approach for file uploads in production
      
      const formData = await c.req.formData();
      const file = formData.get('file') as File;

      if (required && !file) {
        return c.json(
          createErrorResponse(
            'FILE_REQUIRED',
            'File upload is required',
            c.get('requestId')
          ),
          400
        );
      }

      if (file) {
        if (file.size > maxSize) {
          return c.json(
            createErrorResponse(
              'FILE_TOO_LARGE',
              `File size exceeds maximum allowed size of ${maxSize} bytes`,
              c.get('requestId')
            ),
            413
          );
        }

        if (!allowedTypes.includes(file.type)) {
          return c.json(
            createErrorResponse(
              'INVALID_FILE_TYPE',
              `File type must be one of: ${allowedTypes.join(', ')}`,
              c.get('requestId')
            ),
            415
          );
        }

        // Store file in context for later processing
        c.set('uploadedFile', file);
      }
    }

    await next();
  };
}