import { Resolution, GenerationType, CreditCost } from '../value-objects';

export interface ICreditCalculationService {
  calculateCost(
    resolution: Resolution,
    generationType: GenerationType,
    productCount?: number,
    features?: string[]
  ): CreditCost;
}

export interface IImageGenerationService {
  generateImage(prompt: string, options: {
    resolution: Resolution;
    generationType: GenerationType;
  }): Promise<string>;
  enhancePrompt(prompt: string, generationType: GenerationType): string;
}

export interface IWalletService {
  hasInsufficientBalance(userId: string, requiredAmount: number): Promise<boolean>;
  deductCredits(userId: string, amount: number, description: string): Promise<void>;
  addCredits(userId: string, amount: number, description: string): Promise<void>;
}