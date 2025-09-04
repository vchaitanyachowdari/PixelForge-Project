import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '@getmocha/users-service/backend';
import { ApiContext, createSuccessResponse, createErrorResponse } from '../types';

// Database record interfaces
interface WalletBalanceRecord {
  wallet_balance: number;
}

// Request schemas
const TopupRequestSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().optional(),
});

const app = new Hono<ApiContext>();

// Get wallet transactions
app.get('/transactions', authMiddleware, async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json(
      createErrorResponse('USER_NOT_AUTHENTICATED', 'User not authenticated'),
      401
    );
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM wallet_transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `).bind(user.id).all();

    return c.json(createSuccessResponse(results, 'Transactions retrieved successfully'));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return c.json(
      createErrorResponse(
        'TRANSACTIONS_FETCH_FAILED',
        'Failed to fetch wallet transactions'
      ),
      500
    );
  }
});

// Add credits (topup wallet)
app.post('/topup', authMiddleware, zValidator('json', TopupRequestSchema), async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json(
      createErrorResponse('USER_NOT_AUTHENTICATED', 'User not authenticated'),
      401
    );
  }

  const { amount, paymentMethod } = c.req.valid('json');

  try {
    const credits = Math.floor(amount / 25); // 25 rupees per credit

    // Get current balance
    const { results } = await c.env.DB.prepare(
      'SELECT wallet_balance FROM users WHERE id = ?'
    ).bind(user.id).all();

    const currentBalance = (results[0] as unknown as WalletBalanceRecord)?.wallet_balance || 0;
    const newBalance = currentBalance + amount;

    // Update user balance
    await c.env.DB.prepare(
      'UPDATE users SET wallet_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(newBalance, user.id).run();

    // Log transaction
    await c.env.DB.prepare(`
      INSERT INTO wallet_transactions (
        user_id, type, amount, credits_added, balance_after, description, 
        created_at, updated_at
      ) VALUES (?, 'topup', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      user.id,
      amount,
      credits,
      newBalance,
      `Wallet top-up - ${credits} credits via ${paymentMethod || 'default'}`
    ).run();

    return c.json(createSuccessResponse({
      newBalance,
      creditsAdded: credits,
      transactionAmount: amount,
    }, 'Wallet topped up successfully'));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return c.json(
      createErrorResponse(
        'TOPUP_FAILED',
        'Failed to process wallet topup'
      ),
      500
    );
  }
});

// Get wallet balance
app.get('/balance', authMiddleware, async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json(
      createErrorResponse('USER_NOT_AUTHENTICATED', 'User not authenticated'),
      401
    );
  }

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT wallet_balance FROM users WHERE id = ?'
    ).bind(user.id).all();

    const balance = (results[0] as unknown as WalletBalanceRecord)?.wallet_balance || 0;

    return c.json(createSuccessResponse({
      balance,
      credits: Math.floor(balance / 25),
    }, 'Balance retrieved successfully'));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return c.json(
      createErrorResponse(
        'BALANCE_FETCH_FAILED',
        'Failed to fetch wallet balance'
      ),
      500
    );
  }
});

export default {
  path: '/wallet',
  app,
};