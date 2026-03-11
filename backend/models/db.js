/**
 * SQLite database — single source of truth, no ORM duplication
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'minions.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

// ── Schema ─────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    username    TEXT UNIQUE,
    password    TEXT,
    telegram_id TEXT UNIQUE,
    otp_code    TEXT,
    otp_expires INTEGER,
    otp_used    INTEGER DEFAULT 0,
    first_name  TEXT,
    last_name   TEXT,
    photo_url   TEXT,
    bio         TEXT,
    balance     REAL DEFAULT 0,
    frozen_balance REAL DEFAULT 0,
    total_deposited REAL DEFAULT 0,
    total_withdrawn REAL DEFAULT 0,
    total_sales     INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    rating          REAL DEFAULT 5.0,
    review_count    INTEGER DEFAULT 0,
    is_admin        INTEGER DEFAULT 0,
    is_sub_admin    INTEGER DEFAULT 0,
    is_verified     INTEGER DEFAULT 0,
    is_banned       INTEGER DEFAULT 0,
    banned_until    INTEGER,
    ban_reason      TEXT,
    reset_code      TEXT,
    reset_expires   INTEGER,
    created_at      INTEGER DEFAULT (unixepoch()),
    last_active     INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS categories (
    id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name      TEXT NOT NULL,
    slug      TEXT NOT NULL UNIQUE,
    icon      TEXT,
    parent_id TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active  INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS products (
    id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    seller_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    price         REAL NOT NULL,
    category      TEXT NOT NULL,
    subcategory   TEXT,
    images        TEXT DEFAULT '[]',
    delivery_data TEXT,
    delivery_type TEXT DEFAULT 'manual',
    game          TEXT,
    server        TEXT,
    status        TEXT DEFAULT 'active',
    views         INTEGER DEFAULT 0,
    tags          TEXT DEFAULT '[]',
    is_promoted   INTEGER DEFAULT 0,
    promoted_until INTEGER,
    created_at    INTEGER DEFAULT (unixepoch()),
    updated_at    INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS deals (
    id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    buyer_id         TEXT NOT NULL REFERENCES users(id),
    seller_id        TEXT NOT NULL REFERENCES users(id),
    product_id       TEXT NOT NULL REFERENCES products(id),
    amount           REAL NOT NULL,
    seller_amount    REAL NOT NULL,
    commission       REAL NOT NULL,
    status           TEXT DEFAULT 'pending',
    delivery_data    TEXT,
    delivered_at     INTEGER,
    buyer_confirmed  INTEGER DEFAULT 0,
    seller_confirmed INTEGER DEFAULT 0,
    auto_complete_at INTEGER,
    admin_note       TEXT,
    resolved_by      TEXT,
    resolved_at      INTEGER,
    dispute_reason   TEXT,
    created_at       INTEGER DEFAULT (unixepoch()),
    updated_at       INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS deal_messages (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    deal_id    TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    sender_id  TEXT REFERENCES users(id),
    text       TEXT,
    is_system  INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id                 TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id            TEXT NOT NULL REFERENCES users(id),
    type               TEXT NOT NULL,
    amount             REAL NOT NULL,
    currency           TEXT DEFAULT 'USD',
    status             TEXT DEFAULT 'pending',
    description        TEXT,
    deal_id            TEXT REFERENCES deals(id),
    gateway_type       TEXT,
    gateway_invoice_id TEXT,
    gateway_pay_url    TEXT,
    gateway_order_id   TEXT UNIQUE,
    balance_before     REAL,
    balance_after      REAL,
    created_at         INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    deal_id     TEXT NOT NULL UNIQUE REFERENCES deals(id),
    reviewer_id TEXT NOT NULL REFERENCES users(id),
    reviewed_id TEXT NOT NULL REFERENCES users(id),
    rating      INTEGER NOT NULL,
    text        TEXT,
    created_at  INTEGER DEFAULT (unixepoch())
  );

  -- Full-text search for products
  CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
    id UNINDEXED,
    title,
    description,
    tags,
    content='products',
    content_rowid='rowid'
  );

  CREATE TRIGGER IF NOT EXISTS products_fts_insert AFTER INSERT ON products BEGIN
    INSERT INTO products_fts(rowid, id, title, description, tags)
    VALUES (new.rowid, new.id, new.title, new.description, new.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS products_fts_update AFTER UPDATE ON products BEGIN
    INSERT INTO products_fts(products_fts, rowid, id, title, description, tags)
    VALUES ('delete', old.rowid, old.id, old.title, old.description, old.tags);
    INSERT INTO products_fts(rowid, id, title, description, tags)
    VALUES (new.rowid, new.id, new.title, new.description, new.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS products_fts_delete AFTER DELETE ON products BEGIN
    INSERT INTO products_fts(products_fts, rowid, id, title, description, tags)
    VALUES ('delete', old.rowid, old.id, old.title, old.description, old.tags);
  END;

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category, status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_products_seller     ON products(seller_id, status);
  CREATE INDEX IF NOT EXISTS idx_products_status     ON products(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_deals_buyer         ON deals(buyer_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_deals_seller        ON deals(seller_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_deals_status        ON deals(status);
  CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_order  ON transactions(gateway_order_id);
`);

// ── Helper: seed default categories ───────────────────────────────────────────
const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
if (catCount === 0) {
  const insertCat = db.prepare(`INSERT OR IGNORE INTO categories (slug, name, icon, sort_order) VALUES (?, ?, ?, ?)`);
  const cats = [
    ['game-accounts', 'Аккаунты', '🎮', 1],
    ['game-currency', 'Валюта', '💰', 2],
    ['items', 'Предметы', '⚔️', 3],
    ['skins', 'Скины', '🎨', 4],
    ['keys', 'Ключи', '🔑', 5],
    ['subscriptions', 'Подписки', '⭐', 6],
    ['boost', 'Буст', '🚀', 7],
    ['other', 'Прочее', '📦', 8],
  ];
  cats.forEach(c => insertCat.run(...c));
  console.log('✅ Default categories seeded');
}

module.exports = db;
