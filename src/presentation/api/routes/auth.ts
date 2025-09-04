import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import {
  authMiddleware,
  getOAuthRedirectUrl,
  exchangeCodeForSessionToken,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME
} from '@getmocha/users-service/backend';
import { ApiContext, createSuccessResponse, createErrorResponse } from '../types';

// Request schemas
const SessionRequestSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
});

const app = new Hono<ApiContext>();

// Get OAuth redirect URL
app.get('/oauth/google/redirect_url', async (c) => {
  try {
    const redirectUrl = await getOAuthRedirectUrl('google', {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    return c.json(createSuccessResponse({ redirectUrl }, 'OAuth redirect URL generated'));
  } catch (error) {
    return c.json(
      createErrorResponse(
        'OAUTH_REDIRECT_FAILED',
        'Failed to generate OAuth redirect URL'
      ),
      500
    );
  }
});

// Create session from OAuth code
app.post('/sessions', zValidator('json', SessionRequestSchema), async (c) => {
  const { code } = c.req.valid('json');

  try {
    const sessionToken = await exchangeCodeForSessionToken(code, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'none',
      secure: true,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return c.json(createSuccessResponse(null, 'Session created successfully'));
  } catch (error) {
    return c.json(
      createErrorResponse(
        'SESSION_CREATION_FAILED',
        'Failed to create session from authorization code'
      ),
      500
    );
  }
});

// Logout endpoint
app.post('/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    try {
      await deleteSession(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });
    } catch (error) {
      // Log error but don't fail the logout
      console.error('Failed to delete session:', error);
    }
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json(createSuccessResponse(null, 'Logged out successfully'));
});

export default {
  path: '/auth',
  app,
};