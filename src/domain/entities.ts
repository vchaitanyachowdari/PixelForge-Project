// Domain Entities
export interface UserEntity {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  walletBalance: number;
  autoRechargeEnabled: boolean;
  autoRechargeThreshold: number;
  autoRechargeAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedImageEntity {
  id: string;
  userId: string;
  originalPrompt: string;
  enhancedPrompt: string | null;
  imageUrl: string;
  resolution: string;
  generationType: string;
  creditsUsed: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransactionEntity {
  id: number;
  userId: string;
  type: 'topup' | 'deduct' | 'bonus' | 'refund';
  amount: number;
  creditsAdded: number;
  balanceAfter: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}