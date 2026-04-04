/**
 * PostgreSQL database — single source of truth
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

async function queryOne(text, params) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

async function queryAll(text, params) {
  const res = await query(text, params);
  return res.rows;
}

async function run(text, params) {
  return await query(text, params);
}

async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function initSchema() {
  // ── Основные таблицы ──────────────────────────────────────────────────────
  await query(`
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
      avatar          TEXT,
      photo_url       TEXT,
      bio             TEXT,
      balance         NUMERIC(12,2) DEFAULT 0,
      frozen_balance  NUMERIC(12,2) DEFAULT 0,
      total_deposited NUMERIC(12,2) DEFAULT 0,
      total_withdrawn NUMERIC(12,2) DEFAULT 0,
      total_sales     INTEGER DEFAULT 0,
      total_purchases INTEGER DEFAULT 0,
      total_volume    NUMERIC(12,2) DEFAULT 0,
      rating          NUMERIC(3,1) DEFAULT 5.0,
      review_count    INTEGER DEFAULT 0,
      is_admin        INTEGER DEFAULT 0,
      is_sub_admin    INTEGER DEFAULT 0,
      is_verified     INTEGER DEFAULT 0,
      is_banned       INTEGER DEFAULT 0,
      is_frozen       INTEGER DEFAULT 0,
      is_partner      INTEGER DEFAULT 0,
      banned_until    BIGINT,
      ban_reason      TEXT,
      ref_code        TEXT UNIQUE,
      ref_by          TEXT,
      partner_percent INTEGER DEFAULT 10,
      reset_code      TEXT,
      reset_expires   BIGINT,
      last_ip         TEXT,
      register_ip     TEXT,
      last_login_at   BIGINT,
      created_at      BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      last_active     BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name       TEXT NOT NULL,
      slug       TEXT NOT NULL UNIQUE,
      icon       TEXT,
      parent_id  TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active  INTEGER DEFAULT 1
    );

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
      sold_count     INTEGER DEFAULT 0,
      tags           TEXT DEFAULT '[]',
      is_promoted    INTEGER DEFAULT 0,
      promoted_until BIGINT,
      ai_moderated   INTEGER DEFAULT 0,
      moderation_note TEXT,
      created_at     BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      updated_at     BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      PRIMARY KEY (user_id, product_id)
    );

    -- Счётчик для коротких номеров сделок #00001
    CREATE SEQUENCE IF NOT EXISTS deal_number_seq START 1;

    CREATE TABLE IF NOT EXISTS deals (
      id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      deal_number      BIGINT UNIQUE DEFAULT nextval('deal_number_seq'),
      buyer_id         TEXT NOT NULL REFERENCES users(id),
      seller_id        TEXT NOT NULL REFERENCES users(id),
      product_id       TEXT NOT NULL REFERENCES products(id),
      amount           NUMERIC(12,2) NOT NULL,
      seller_amount    NUMERIC(12,2) NOT NULL,
      commission       NUMERIC(12,2) NOT NULL,
      status           TEXT DEFAULT 'pending',
      delivery_data    TEXT,
      delivered_at     BIGINT,
      completed_at     BIGINT,
      buyer_confirmed  INTEGER DEFAULT 0,
      seller_confirmed INTEGER DEFAULT 0,
      auto_complete_at BIGINT,
      admin_note       TEXT,
      resolved_by      TEXT,
      resolved_at      BIGINT,
      dispute_reason   TEXT,
      refund_reason    TEXT,
      created_at       BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      updated_at       BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    CREATE TABLE IF NOT EXISTS deal_messages (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      deal_id    TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      sender_id  TEXT REFERENCES users(id),
      text       TEXT,
      is_system  INTEGER DEFAULT 0,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

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

    CREATE TABLE IF NOT EXISTS reviews (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      deal_id     TEXT NOT NULL UNIQUE REFERENCES deals(id),
      reviewer_id TEXT NOT NULL REFERENCES users(id),
      reviewed_id TEXT NOT NULL REFERENCES users(id),
      rating      INTEGER NOT NULL,
      text        TEXT,
      created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      sender_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text        TEXT NOT NULL,
      image       TEXT,
      is_read     INTEGER DEFAULT 0,
      created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    CREATE TABLE IF NOT EXISTS security_logs (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      event      TEXT NOT NULL,
      ip         TEXT,
      user_id    TEXT,
      username   TEXT,
      details    TEXT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
  `);

  // ── Новые таблицы для аналитики ──────────────────────────────────────────
  await query(`
    -- Лог всех действий (аудит)
    CREATE TABLE IF NOT EXISTS audit_log (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      actor_id   TEXT,
      actor_name TEXT,
      action     TEXT NOT NULL,
      target     TEXT,
      details    JSONB,
      ip         TEXT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Ежедневный снапшот статистики платформы
    CREATE TABLE IF NOT EXISTS platform_stats (
      id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      date             TEXT NOT NULL UNIQUE,
      new_users        INTEGER DEFAULT 0,
      active_users     INTEGER DEFAULT 0,
      new_deals        INTEGER DEFAULT 0,
      completed_deals  INTEGER DEFAULT 0,
      disputed_deals   INTEGER DEFAULT 0,
      refunded_deals   INTEGER DEFAULT 0,
      total_volume     NUMERIC(12,2) DEFAULT 0,
      total_commission NUMERIC(12,2) DEFAULT 0,
      total_deposited  NUMERIC(12,2) DEFAULT 0,
      total_withdrawn  NUMERIC(12,2) DEFAULT 0,
      new_products     INTEGER DEFAULT 0,
      created_at       BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Промокоды
    CREATE TABLE IF NOT EXISTS promo_codes (
      id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      code             TEXT UNIQUE NOT NULL,
      discount_percent INTEGER NOT NULL,
      expires_at       BIGINT,
      uses_left        INTEGER DEFAULT 100,
      uses_total       INTEGER DEFAULT 0,
      created_by       TEXT,
      created_at       BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Использования промокодов
    CREATE TABLE IF NOT EXISTS promo_uses (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      promo_id   TEXT NOT NULL REFERENCES promo_codes(id),
      user_id    TEXT NOT NULL REFERENCES users(id),
      deal_id    TEXT REFERENCES deals(id),
      discount   NUMERIC(12,2),
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      UNIQUE(promo_id, user_id)
    );

    -- Реферальные вознаграждения
    CREATE TABLE IF NOT EXISTS referral_rewards (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      partner_id TEXT NOT NULL REFERENCES users(id),
      user_id    TEXT REFERENCES users(id),
      deal_id    TEXT REFERENCES deals(id),
      amount     NUMERIC(12,2) NOT NULL,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- История казино
    CREATE TABLE IF NOT EXISTS casino_log (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id    TEXT NOT NULL REFERENCES users(id),
      symbols    TEXT,
      prize      NUMERIC(12,2) DEFAULT 0,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Просмотры товаров (детальная аналитика)
    CREATE TABLE IF NOT EXISTS product_views (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id    TEXT REFERENCES users(id),
      ip         TEXT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Уведомления (хранимая история)
    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT NOT NULL,
      title      TEXT NOT NULL,
      body       TEXT,
      is_read    INTEGER DEFAULT 0,
      link       TEXT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Жалобы на товары/пользователей
    CREATE TABLE IF NOT EXISTS reports (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      reporter_id TEXT NOT NULL REFERENCES users(id),
      target_type TEXT NOT NULL,
      target_id   TEXT NOT NULL,
      reason      TEXT NOT NULL,
      details     TEXT,
      status      TEXT DEFAULT 'pending',
      resolved_by TEXT,
      resolved_at BIGINT,
      created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
  `);

  // ── Миграции (безопасные ALTER TABLE) ────────────────────────────────────
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_frozen INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_partner INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_code TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_by TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_percent INTEGER DEFAULT 10;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS total_volume NUMERIC(12,2) DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at BIGINT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ip TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS register_ip TEXT;

    ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_count INTEGER DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_moderated INTEGER DEFAULT 0;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS moderation_note TEXT;

    ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_number BIGINT;
    ALTER TABLE deals ADD COLUMN IF NOT EXISTS completed_at BIGINT;
    ALTER TABLE deals ADD COLUMN IF NOT EXISTS refund_reason TEXT;

    ALTER TABLE messages ADD COLUMN IF NOT EXISTS image TEXT;
  `);

  // Заполняем deal_number для старых сделок у которых его нет
  await query(`
    CREATE SEQUENCE IF NOT EXISTS deal_number_seq START 1;
    UPDATE deals SET deal_number = nextval('deal_number_seq') WHERE deal_number IS NULL;
  `).catch(() => {});

  // ── Индексы ───────────────────────────────────────────────────────────────
  await query(`
    CREATE INDEX IF NOT EXISTS idx_security_logs_ip      ON security_logs(ip);
    CREATE INDEX IF NOT EXISTS idx_security_logs_event   ON security_logs(event, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_category     ON products(category, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_seller       ON products(seller_id, status);
    CREATE INDEX IF NOT EXISTS idx_products_status       ON products(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_deals_buyer           ON deals(buyer_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_deals_seller          ON deals(seller_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_deals_status          ON deals(status);
    CREATE INDEX IF NOT EXISTS idx_deals_number          ON deals(deal_number DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_order    ON transactions(gateway_order_id);
    CREATE INDEX IF NOT EXISTS idx_audit_actor           ON audit_log(actor_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_action          ON audit_log(action, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_platform_stats_date   ON platform_stats(date DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id, is_read, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_status        ON reports(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_sender       ON messages(sender_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver     ON messages(receiver_id, is_read, created_at DESC);
  `);

  // ── Seed categories ───────────────────────────────────────────────────────
  const { rows } = await query(`SELECT COUNT(*) as c FROM categories`);
  if (parseInt(rows[0].c) === 0) {
    const cats = [
      ['game-accounts', 'Аккаунты',   '🎮', 1],
      ['game-currency', 'Валюта',      '💰', 2],
      ['items',         'Предметы',    '⚔️', 3],
      ['skins',         'Скины',       '🎨', 4],
      ['keys',          'Ключи',       '🔑', 5],
      ['subscriptions', 'Подписки',    '⭐', 6],
      ['boost',         'Буст',        '🚀', 7],
      ['other',         'Прочее',      '📦', 8],
    ];
    for (const [slug, name, icon, sort_order] of cats) {
      await query(
        `INSERT INTO categories (slug, name, icon, sort_order) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [slug, name, icon, sort_order]
      );
    }
    console.log('✅ Default categories seeded');
  }

  console.log('✅ PostgreSQL database ready');
}

// ── Утилита: записать аудит-лог ───────────────────────────────────────────────
async function auditLog(actorId, actorName, action, target, details, ip) {
  return run(
    `INSERT INTO audit_log (id, actor_id, actor_name, action, target, details, ip, created_at)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [actorId || null, actorName || null, action, target || null,
     details ? JSON.stringify(details) : null, ip || null]
  ).catch(() => {});
}

// ── Утилита: сохранить уведомление в БД ──────────────────────────────────────
async function saveNotification(userId, type, title, body, link) {
  return run(
    `INSERT INTO notifications (id, user_id, type, title, body, link, created_at)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [userId, type, title, body || null, link || null]
  ).catch(() => {});
}

// ── Утилита: снапшот статистики за сегодня ────────────────────────────────────
async function snapshotDailyStats() {
  const today = new Date().toISOString().slice(0, 10);
  const dayStart = Math.floor(new Date(today).getTime() / 1000);
  const dayEnd   = dayStart + 86400;

  const [users, active, deals, completed, disputed, refunded, volume, commission, deposited, withdrawn, products] = await Promise.all([
    queryOne(`SELECT COUNT(*) as c FROM users WHERE created_at >= $1 AND created_at < $2`, [dayStart, dayEnd]),
    queryOne(`SELECT COUNT(*) as c FROM users WHERE last_active >= $1`, [dayStart]),
    queryOne(`SELECT COUNT(*) as c FROM deals WHERE created_at >= $1 AND created_at < $2`, [dayStart, dayEnd]),
    queryOne(`SELECT COUNT(*) as c FROM deals WHERE status='completed' AND completed_at >= $1 AND completed_at < $2`, [dayStart, dayEnd]),
    queryOne(`SELECT COUNT(*) as c FROM deals WHERE status='disputed' AND created_at >= $1 AND created_at < $2`, [dayStart, dayEnd]),
    queryOne(`SELECT COUNT(*) as c FROM deals WHERE status='refunded' AND created_at >= $1 AND created_at < $2`, [dayStart, dayEnd]),
    queryOne(`SELECT COALESCE(SUM(amount),0) as t FROM deals WHERE status='completed' AND completed_at >= $1 AND completed_at < $2`, [dayStart, dayEnd]),
    queryOne(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='commission' AND status='completed' AND created_at >= $1 AND created_at < $2`, [dayStart, dayEnd]),
    queryOne(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='deposit' AND status='completed' AND created_at >= $1 AND created_at < $2`, [dayStart, dayEnd]),
    queryOne(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type IN ('withdraw','withdrawal') AND status='completed' AND created_at >= $1 AND created_at < $2`, [dayStart, dayEnd]),
    queryOne(`SELECT COUNT(*) as c FROM products WHERE created_at >= $1 AND created_at < $2`, [dayStart, dayEnd]),
  ]);

  await run(`
    INSERT INTO platform_stats
      (id, date, new_users, active_users, new_deals, completed_deals, disputed_deals,
       refunded_deals, total_volume, total_commission, total_deposited, total_withdrawn, new_products)
    VALUES (gen_random_uuid()::text, $1, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT (date) DO UPDATE SET
      new_users=$2, active_users=$3, new_deals=$4, completed_deals=$5,
      disputed_deals=$6, refunded_deals=$7, total_volume=$8,
      total_commission=$9, total_deposited=$10, total_withdrawn=$11, new_products=$12
  `, [today,
    parseInt(users?.c||0), parseInt(active?.c||0),
    parseInt(deals?.c||0), parseInt(completed?.c||0),
    parseInt(disputed?.c||0), parseInt(refunded?.c||0),
    parseFloat(volume?.t||0), parseFloat(commission?.t||0),
    parseFloat(deposited?.t||0), parseFloat(withdrawn?.t||0),
    parseInt(products?.c||0)
  ]);

  return today;
}

module.exports = {
  query, queryOne, queryAll, run, transaction, pool,
  initSchema, auditLog, saveNotification, snapshotDailyStats,
};
