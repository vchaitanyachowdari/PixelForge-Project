import { UserEntity, GeneratedImageEntity } from '../entities';
import { WalletTransaction } from '../../shared/types';

// Repository Interfaces
export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(user: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
  updateWalletBalance(id: string, amount: number): Promise<UserEntity>;
}

export interface IImageRepository {
  findById(id: string): Promise<GeneratedImageEntity | null>;
  findByUserId(userId: string, limit?: number): Promise<GeneratedImageEntity[]>;
  create(image: Omit<GeneratedImageEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<GeneratedImageEntity>;
  updateStatus(id: string, status: GeneratedImageEntity['status']): Promise<GeneratedImageEntity>;
}

export interface IWalletRepository {
  getBalance(userId: string): Promise<number>;
  addTransaction(transaction: Omit<WalletTransaction, 'id' | 'createdAt'>): Promise<void>;
  getTransactions(userId: string, limit?: number): Promise<WalletTransaction[]>;
}