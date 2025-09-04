import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '@getmocha/users-service/backend';
import { GenerationRequestSchema, calculateCreditCost } from '../../../shared/types';
import { ApiContext, createSuccessResponse, createErrorResponse } from '../types';

interface UserBalanceRecord {
  wallet_balance: number;
}

const app = new Hono<ApiContext>();

// Generate image endpoint
app.post('/generate', authMiddleware, zValidator('json', GenerationRequestSchema), async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json(
      createErrorResponse('USER_NOT_AUTHENTICATED', 'User not authenticated'),
      401
    );
  }

  const { prompt, resolution, generationType, productImages } = c.req.valid('json');

  try {
    // Calculate credit cost
    const creditCost = calculateCreditCost(resolution, productImages.length);
    const rupeesCost = creditCost * 25;

    // Check user's wallet balance
    const { results } = await c.env.DB.prepare(
      'SELECT wallet_balance FROM users WHERE id = ?'
    ).bind(user.id).all();

    const currentBalance = (results[0] as unknown as UserBalanceRecord)?.wallet_balance || 0;

    if (currentBalance < rupeesCost) {
      return c.json(
        createErrorResponse(
          'INSUFFICIENT_BALANCE',
          `Insufficient wallet balance. Required: ₹${rupeesCost}, Current: ₹${currentBalance}`
        ),
        400
      );
    }

    // Enhance the prompt
    const enhancedPrompt = enhanceProductPrompt(prompt, generationType, resolution);

    // Generate placeholder image (replace with actual AI service)
    const imageUrl = await generatePlaceholderImage(enhancedPrompt, resolution);
    const generationId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Deduct credits from user's wallet
    const newBalance = currentBalance - rupeesCost;
    
    await c.env.DB.prepare(
      'UPDATE users SET wallet_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(newBalance, user.id).run();

    // Log wallet transaction
    await c.env.DB.prepare(`
      INSERT INTO wallet_transactions (
        user_id, type, amount, credits_added, balance_after, description, 
        created_at, updated_at
      ) VALUES (?, 'deduct', ?, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      user.id,
      rupeesCost,
      newBalance,
      `Image generation - ${resolution} - ${creditCost} credits`
    ).run();

    // Save generated image
    await c.env.DB.prepare(`
      INSERT INTO generated_images (
        id, user_id, original_prompt, enhanced_prompt, image_url, resolution, 
        generation_type, credits_used, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      generationId,
      user.id,
      prompt,
      enhancedPrompt,
      imageUrl,
      resolution,
      generationType,
      creditCost
    ).run();

    return c.json(createSuccessResponse({
      id: generationId,
      imageUrl,
      creditsUsed: creditCost,
      newBalance,
      enhancedPrompt,
    }, 'Image generated successfully'));

  } catch (error) {
    return c.json(
      createErrorResponse(
        'IMAGE_GENERATION_FAILED',
        error instanceof Error ? error.message : 'Failed to generate image'
      ),
      500
    );
  }
});

// Get user's generated images
app.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json(
      createErrorResponse('USER_NOT_AUTHENTICATED', 'User not authenticated'),
      401
    );
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM generated_images 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).bind(user.id).all();

    return c.json(createSuccessResponse(results, 'Images retrieved successfully'));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return c.json(
      createErrorResponse(
        'IMAGES_FETCH_FAILED',
        'Failed to fetch generated images'
      ),
      500
    );
  }
});

// Helper functions (move to services later)
function enhanceProductPrompt(basePrompt: string, generationType: string, resolution: string): string {
  let enhancement = '';

  switch (generationType) {
    case 'lifestyle':
      enhancement = 'Professional lifestyle product photography, natural lighting, real-world setting, ';
      break;
    case 'studio':
      enhancement = 'Professional studio product photography, clean background, perfect lighting, commercial quality, ';
      break;
    case 'seasonal':
      enhancement = 'Seasonal themed product photography, atmospheric lighting, contextual elements, ';
      break;
    case 'ecommerce':
      enhancement = 'E-commerce product photography, clean white background, sharp focus, high detail, ';
      break;
    default:
      enhancement = 'Professional product photography, high quality, detailed, ';
  }

  const qualityEnhancement = resolution.includes('4K') || resolution.includes('2560') 
    ? 'ultra high resolution, 8K quality, extremely detailed, ' 
    : 'high resolution, sharp focus, detailed, ';

  return `${enhancement}${qualityEnhancement}${basePrompt}, professional commercial photography, perfect composition, award-winning photography`;
}

async function generatePlaceholderImage(_prompt: string, resolution: string): Promise<string> {
  const [width, height] = resolution.split('x');
  return `https://picsum.photos/${width}/${height}?random=${Date.now()}`;
}

export default {
  path: '/images',
  app,
};