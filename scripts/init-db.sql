-- Minions Market Database Schema
-- Run this to initialize the PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username        TEXT UNIQUE,
  password        TEXT,
  telegram_id     TEXT UNIQUE,
  otp_code        TEXT,
  otp_expires     BIGINT,
  otp_used        INTEGER DEFAULT 0,
  first_name      TEXT,
  last_name       TEXT,
  photo_url       TEXT,
  bio             TEXT,
  balance         NUMERIC(12,2) DEFAULT 0,
  frozen_balance  NUMERIC(12,2) DEFAULT 0,
  total_deposited NUMERIC(12,2) DEFAULT 0,
  total_withdrawn NUMERIC(12,2) DEFAULT 0,
  total_sales     INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  rating          NUMERIC(3,1) DEFAULT 5.0,
  review_count    INTEGER DEFAULT 0,
  is_admin        INTEGER DEFAULT 0,
  is_sub_admin    INTEGER DEFAULT 0,
  is_verified     INTEGER DEFAULT 0,
  is_banned       INTEGER DEFAULT 0,
  banned_until    BIGINT,
  ban_reason      TEXT,
  reset_code      TEXT,
  reset_expires   BIGINT,
  last_ip         TEXT,
  register_ip     TEXT,
  seller_level    TEXT DEFAULT 'newcomer',
  level_override  INTEGER DEFAULT 0,
  ref_code        TEXT DEFAULT NULL,
  ref_by          TEXT DEFAULT NULL,
  is_partner      INTEGER DEFAULT 0,
  partner_percent INTEGER DEFAULT 5,
  partner_earned  REAL DEFAULT 0,
  ai_reactivated  INTEGER DEFAULT 0,
  created_at      BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  last_active     BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code) WHERE ref_code IS NOT NULL;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  icon       TEXT,
  parent_id  TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active  INTEGER DEFAULT 1
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  seller_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  price          NUMERIC(12,2) NOT NULL,
  category       TEXT NOT NULL,
  subcategory    TEXT,
  images         TEXT DEFAULT '[]',
  delivery_data  TEXT,
  delivery_type  TEXT DEFAULT 'manual',
  game           TEXT,
  server         TEXT,
  status         TEXT DEFAULT 'active',
  views          INTEGER DEFAULT 0,
  tags           TEXT DEFAULT '[]',
  is_promoted    INTEGER DEFAULT 0,
  promoted_until BIGINT,
  ai_moderated   INTEGER DEFAULT 0,
  ai_price_advised INTEGER DEFAULT 0,
  created_at     BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  updated_at     BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  PRIMARY KEY (user_id, product_id)
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  buyer_id         TEXT NOT NULL REFERENCES users(id),
  seller_id        TEXT NOT NULL REFERENCES users(id),
  product_id       TEXT NOT NULL REFERENCES products(id),
  amount           NUMERIC(12,2) NOT NULL,
  seller_amount    NUMERIC(12,2) NOT NULL,
  commission       NUMERIC(12,2) NOT NULL,
  status           TEXT DEFAULT 'pending',
  delivery_data    TEXT,
  delivered_at     BIGINT,
  buyer_confirmed  INTEGER DEFAULT 0,
  seller_confirmed INTEGER DEFAULT 0,
  auto_complete_at BIGINT,
  admin_note       TEXT,
  resolved_by      TEXT,
  resolved_at      BIGINT,
  dispute_reason   TEXT,
  created_at       BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  updated_at       BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- Deal messages table
CREATE TABLE IF NOT EXISTS deal_messages (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  deal_id    TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  sender_id  TEXT REFERENCES users(id),
  text       TEXT,
  is_system  INTEGER DEFAULT 0,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id            TEXT NOT NULL REFERENCES users(id),
  type               TEXT NOT NULL,
  amount             NUMERIC(12,2) NOT NULL,
  currency           TEXT DEFAULT 'USD',
  status             TEXT DEFAULT 'pending',
  description        TEXT,
  deal_id            TEXT REFERENCES deals(id),
  gateway_type       TEXT,
  gateway_invoice_id TEXT,
  gateway_pay_url    TEXT,
  gateway_order_id   TEXT UNIQUE,
  balance_before     NUMERIC(12,2),
  balance_after      NUMERIC(12,2),
  created_at         BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- Security logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event      TEXT NOT NULL,
  ip         TEXT,
  user_id    TEXT,
  username   TEXT,
  details    TEXT,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON security_logs(ip);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON security_logs(event, created_at DESC);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  deal_id     TEXT NOT NULL UNIQUE REFERENCES deals(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  reviewed_id TEXT NOT NULL REFERENCES users(id),
  rating      INTEGER NOT NULL,
  text        TEXT,
  created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sender_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  image       TEXT DEFAULT NULL,
  is_read     INTEGER DEFAULT 0,
  created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, is_read, created_at DESC);

-- Referral rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  partner_id TEXT REFERENCES users(id),
  referred_user_id TEXT REFERENCES users(id),
  deal_id TEXT,
  amount REAL DEFAULT 0,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  icon TEXT DEFAULT '🔔',
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_seller    ON products(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_products_status    ON products(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_buyer        ON deals(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_seller       ON deals(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_status       ON deals(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user  ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(gateway_order_id);

-- Seed default categories
INSERT INTO categories (slug, name, icon, sort_order) VALUES 
  ('game-accounts', 'Аккаунты', '🎮', 1),
  ('game-currency', 'Валюта', '💰', 2),
  ('items', 'Предметы', '⚔️', 3),
  ('skins', 'Скины', '🎨', 4),
  ('keys', 'Ключи', '🔑', 5),
  ('subscriptions', 'Подписки', '⭐', 6),
  ('boost', 'Буст', '🚀', 7),
  ('other', 'Прочее', '📦', 8)
ON CONFLICT (slug) DO NOTHING;
