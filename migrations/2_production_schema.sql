-- Enhanced production database schema for PixelForge
-- Created: 2025-01-04
-- Version: 2.0.0

-- Users table with enhanced fields and constraints
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  wallet_balance INTEGER DEFAULT 0 CHECK (wallet_balance >= 0),
  auto_recharge_enabled INTEGER DEFAULT 0 CHECK (auto_recharge_enabled IN (0, 1)),
  auto_recharge_threshold INTEGER DEFAULT 100 CHECK (auto_recharge_threshold >= 0),
  auto_recharge_amount INTEGER DEFAULT 500 CHECK (auto_recharge_amount >= 0),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  total_generations INTEGER DEFAULT 0 CHECK (total_generations >= 0),
  total_spent INTEGER DEFAULT 0 CHECK (total_spent >= 0),
  last_login_at DATETIME,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enhanced generated images table
CREATE TABLE IF NOT EXISTS generated_images (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  original_prompt TEXT NOT NULL CHECK (length(original_prompt) > 0),
  enhanced_prompt TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  resolution TEXT NOT NULL CHECK (resolution IN ('1024x1024', '1920x1080', '1080x1920', '2560x1440', '3840x2160')),
  generation_type TEXT NOT NULL CHECK (generation_type IN ('standard', 'lifestyle', 'studio', 'seasonal', 'ecommerce')),
  credits_used INTEGER NOT NULL CHECK (credits_used > 0),
  generation_time_ms INTEGER,
  file_size_bytes INTEGER,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  metadata TEXT, -- JSON metadata
  tags TEXT, -- Comma-separated tags
  is_public INTEGER DEFAULT 0 CHECK (is_public IN (0, 1)),
  likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
  downloads_count INTEGER DEFAULT 0 CHECK (downloads_count >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Enhanced wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup', 'deduct', 'bonus', 'refund', 'adjustment')),
  amount INTEGER NOT NULL,
  credits_added INTEGER DEFAULT 0,
  balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  description TEXT,
  transaction_reference TEXT, -- External payment reference
  payment_method TEXT, -- stripe, paypal, etc.
  metadata TEXT, -- JSON metadata
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status_created ON users(status, created_at);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_status ON generated_images(status);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_created ON generated_images(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_public ON generated_images(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_generation_type ON generated_images(generation_type);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);

-- Triggers for maintaining data consistency
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_generated_images_updated_at 
  AFTER UPDATE ON generated_images
  FOR EACH ROW
  BEGIN
    UPDATE generated_images SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_wallet_transactions_updated_at 
  AFTER UPDATE ON wallet_transactions
  FOR EACH ROW
  BEGIN
    UPDATE wallet_transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;