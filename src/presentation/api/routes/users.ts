import { Hono } from 'hono';
import { authMiddleware } from '@getmocha/users-service/backend';
import { ApiContext, createSuccessResponse, createErrorResponse } from '../types';

const app = new Hono<ApiContext>();

// Get current user profile
app.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json(
      createErrorResponse('USER_NOT_AUTHENTICATED', 'User not authenticated'),
      401
    );
  }

  try {
    // Check if user exists in our database
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(user.id).all();

    if (results.length === 0) {
      // Create user in our database
      await c.env.DB.prepare(`
        INSERT INTO users (
          id, email, name, picture, wallet_balance, 
          auto_recharge_enabled, auto_recharge_threshold, auto_recharge_amount,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, 0, 100, 500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        user.id,
        user.email,
        user.google_user_data?.name || null,
        user.google_user_data?.picture || null
      ).run();

      // Fetch the newly created user
      const { results: newUserResults } = await c.env.DB.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(user.id).all();
      
      const userRecord = newUserResults[0] as any;

      return c.json(createSuccessResponse({
        id: user.id,
        email: user.email,
        name: userRecord.name,
        picture: userRecord.picture,
        walletBalance: userRecord.wallet_balance,
        autoRechargeEnabled: Boolean(userRecord.auto_recharge_enabled),
        autoRechargeThreshold: userRecord.auto_recharge_threshold,
        autoRechargeAmount: userRecord.auto_recharge_amount,
      }, 'User profile retrieved'));
    }

    const userRecord = results[0] as any;

    return c.json(createSuccessResponse({
      id: user.id,
      email: user.email,
      name: userRecord.name,
      picture: userRecord.picture,
      walletBalance: userRecord.wallet_balance,
      autoRechargeEnabled: Boolean(userRecord.auto_recharge_enabled),
      autoRechargeThreshold: userRecord.auto_recharge_threshold,
      autoRechargeAmount: userRecord.auto_recharge_amount,
    }, 'User profile retrieved'));

  } catch (error) {
    return c.json(
      createErrorResponse(
        'USER_FETCH_FAILED',
        'Failed to fetch user profile'
      ),
      500
    );
  }
});

// Update user profile
app.put('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json(
      createErrorResponse('USER_NOT_AUTHENTICATED', 'User not authenticated'),
      401
    );
  }

  try {
    const body = await c.req.json();
    const { name, autoRechargeEnabled, autoRechargeThreshold, autoRechargeAmount } = body;

    await c.env.DB.prepare(`
      UPDATE users 
      SET name = ?, auto_recharge_enabled = ?, auto_recharge_threshold = ?, 
          auto_recharge_amount = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      name || null,
      autoRechargeEnabled ? 1 : 0,
      autoRechargeThreshold || 100,
      autoRechargeAmount || 500,
      user.id
    ).run();

    return c.json(createSuccessResponse(null, 'User profile updated'));

  } catch (error) {
    return c.json(
      createErrorResponse(
        'USER_UPDATE_FAILED',
        'Failed to update user profile'
      ),
      500
    );
  }
});

export default {
  path: '/users',
  app,
};