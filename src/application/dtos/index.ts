import { z } from 'zod';

// Request DTOs
export const GenerateImageRequestDto = z.object({
  prompt: z.string().min(1).max(1000),
  resolution: z.enum(['1024x1024', '1920x1080', '1080x1920', '2560x1440', '3840x2160']),
  generationType: z.enum(['standard', 'lifestyle', 'studio', 'seasonal', 'ecommerce']),
  productImages: z.array(z.string()).min(1).max(5),
});

export const TopupWalletRequestDto = z.object({
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
});

// Response DTOs
export const UserResponseDto = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  picture: z.string().nullable(),
  walletBalance: z.number(),
  autoRechargeEnabled: z.boolean(),
});

export const GeneratedImageResponseDto = z.object({
  id: z.string(),
  imageUrl: z.string(),
  creditsUsed: z.number(),
  enhancedPrompt: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
});

// Types
export type GenerateImageRequest = z.infer<typeof GenerateImageRequestDto>;
export type TopupWalletRequest = z.infer<typeof TopupWalletRequestDto>;
export type UserResponse = z.infer<typeof UserResponseDto>;
export type GeneratedImageResponse = z.infer<typeof GeneratedImageResponseDto>;