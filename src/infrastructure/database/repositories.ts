import { IUserRepository } from '../../domain/repositories';
import { UserEntity } from '../../domain/entities';

export class D1UserRepository implements IUserRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<UserEntity | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first();
    
    return result ? this.mapToEntity(result) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();
    
    return result ? this.mapToEntity(result) : null;
  }

  async create(user: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    await this.db
      .prepare(`
        INSERT INTO users (id, email, name, picture, wallet_balance, 
                          auto_recharge_enabled, auto_recharge_threshold, 
                          auto_recharge_amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id, user.email, user.name, user.picture, user.walletBalance,
        user.autoRechargeEnabled, user.autoRechargeThreshold,
        user.autoRechargeAmount, now.toISOString(), now.toISOString()
      )
      .run();

    return { ...user, id, createdAt: now, updatedAt: now };
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    // Implementation for update
    throw new Error('Not implemented');
  }

  async updateWalletBalance(id: string, amount: number): Promise<UserEntity> {
    // Implementation for wallet balance update
    throw new Error('Not implemented');
  }

  private mapToEntity(row: any): UserEntity {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      walletBalance: row.wallet_balance,
      autoRechargeEnabled: Boolean(row.auto_recharge_enabled),
      autoRechargeThreshold: row.auto_recharge_threshold,
      autoRechargeAmount: row.auto_recharge_amount,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}