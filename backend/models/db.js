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

  // ── Расширенные лог-таблицы ──────────────────────────────────────────────
  await query(`
    -- Полный лог сессий (вход, выход, токены)
    CREATE TABLE IF NOT EXISTS session_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      username    TEXT,
      telegram_id TEXT,
      event       TEXT NOT NULL,
      platform    TEXT,
      ip          TEXT,
      user_agent  TEXT,
      device      TEXT,
      country     TEXT,
      details     JSONB,
      created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Полный лог чатов (все сообщения между пользователями)
    CREATE TABLE IF NOT EXISTS chat_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      sender_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
      receiver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      sender_name TEXT,
      receiver_name TEXT,
      message_id  TEXT,
      text        TEXT,
      image       TEXT,
      context     TEXT,
      deal_id     TEXT,
      created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Лог всех действий пользователей (каждый клик/запрос)
    CREATE TABLE IF NOT EXISTS action_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      username    TEXT,
      action      TEXT NOT NULL,
      entity      TEXT,
      entity_id   TEXT,
      old_value   JSONB,
      new_value   JSONB,
      ip          TEXT,
      platform    TEXT,
      details     JSONB,
      created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Лог бота (все входящие и исходящие сообщения Telegram бота)
    CREATE TABLE IF NOT EXISTS bot_logs (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      telegram_id  TEXT,
      username     TEXT,
      direction    TEXT NOT NULL,
      message_type TEXT,
      text         TEXT,
      command      TEXT,
      response     TEXT,
      details      JSONB,
      created_at   BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Лог платежей (детальный, с каждым шагом)
    CREATE TABLE IF NOT EXISTS payment_logs (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
      username     TEXT,
      gateway      TEXT NOT NULL,
      event        TEXT NOT NULL,
      amount       NUMERIC(12,2),
      currency     TEXT,
      order_id     TEXT,
      invoice_id   TEXT,
      status       TEXT,
      raw_payload  JSONB,
      ip           TEXT,
      created_at   BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Лог API запросов (все HTTP запросы к бэкенду)
    CREATE TABLE IF NOT EXISTS api_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      username    TEXT,
      method      TEXT,
      path        TEXT,
      status_code INTEGER,
      duration_ms INTEGER,
      ip          TEXT,
      user_agent  TEXT,
      body_size   INTEGER,
      created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Лог ошибок (все серверные ошибки)
    CREATE TABLE IF NOT EXISTS error_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      error_type  TEXT,
      message     TEXT,
      stack       TEXT,
      path        TEXT,
      ip          TEXT,
      details     JSONB,
      created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Лог AI действий (каждый запрос к AI и ответ)
    CREATE TABLE IF NOT EXISTS ai_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      context     TEXT NOT NULL,
      model       TEXT,
      prompt_len  INTEGER,
      response    TEXT,
      tokens_used INTEGER,
      duration_ms INTEGER,
      success     INTEGER DEFAULT 1,
      error       TEXT,
      created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Лог сделок (каждое изменение статуса)
    CREATE TABLE IF NOT EXISTS deal_status_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      deal_id     TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
      actor_name  TEXT,
      old_status  TEXT,
      new_status  TEXT,
      note        TEXT,
      ip          TEXT,
      created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Лог просмотров страниц (фронтенд аналитика)
    CREATE TABLE IF NOT EXISTS page_views (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      session_id  TEXT,
      path        TEXT,
      referrer    TEXT,
      ip          TEXT,
      user_agent  TEXT,
      created_at  BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );

    -- Поисковые запросы
    CREATE TABLE IF NOT EXISTS search_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      query       TEXT,
      results     INTEGER,
      ip          TEXT,
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

    CREATE INDEX IF NOT EXISTS idx_session_logs_user     ON session_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_session_logs_event    ON session_logs(event, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_session_logs_ip       ON session_logs(ip, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_logs_sender      ON chat_logs(sender_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_logs_receiver    ON chat_logs(receiver_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_logs_deal        ON chat_logs(deal_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_action_logs_user      ON action_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_action_logs_action    ON action_logs(action, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bot_logs_tgid         ON bot_logs(telegram_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_logs_user     ON payment_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_logs_gateway  ON payment_logs(gateway, event, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_api_logs_user         ON api_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_api_logs_path         ON api_logs(path, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_error_logs_type       ON error_logs(error_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_logs_context       ON ai_logs(context, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_deal_status_logs_deal ON deal_status_logs(deal_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_page_views_user       ON page_views(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_search_logs_user      ON search_logs(user_id, created_at DESC);
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

// ── Логирование сессий (вход/выход/токены) ───────────────────────────────────
async function logSession(userId, username, telegramId, event, platform, ip, userAgent, details) {
  const device = userAgent
    ? (userAgent.includes('Mobile') ? 'mobile' : 'desktop')
    : 'unknown';
  return run(
    `INSERT INTO session_logs (user_id, username, telegram_id, event, platform, ip, user_agent, device, details, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [userId||null, username||null, telegramId||null, event, platform||'web',
     ip||null, userAgent||null, device, details ? JSON.stringify(details) : null]
  ).catch(() => {});
}

// ── Логирование чатов (все сообщения) ────────────────────────────────────────
async function logChat(senderId, receiverId, senderName, receiverName, messageId, text, image, context, dealId) {
  return run(
    `INSERT INTO chat_logs (sender_id, receiver_id, sender_name, receiver_name, message_id, text, image, context, deal_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [senderId||null, receiverId||null, senderName||null, receiverName||null,
     messageId||null, text||null, image||null, context||'direct', dealId||null]
  ).catch(() => {});
}

// ── Логирование действий пользователей ───────────────────────────────────────
async function logAction(userId, username, action, entity, entityId, oldValue, newValue, ip, platform, details) {
  return run(
    `INSERT INTO action_logs (user_id, username, action, entity, entity_id, old_value, new_value, ip, platform, details, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [userId||null, username||null, action, entity||null, entityId||null,
     oldValue ? JSON.stringify(oldValue) : null,
     newValue ? JSON.stringify(newValue) : null,
     ip||null, platform||'web',
     details ? JSON.stringify(details) : null]
  ).catch(() => {});
}

// ── Логирование бота ──────────────────────────────────────────────────────────
async function logBot(telegramId, username, direction, messageType, text, command, response, details) {
  return run(
    `INSERT INTO bot_logs (telegram_id, username, direction, message_type, text, command, response, details, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [String(telegramId||''), username||null, direction, messageType||'text',
     text ? text.slice(0,2000) : null, command||null,
     response ? response.slice(0,2000) : null,
     details ? JSON.stringify(details) : null]
  ).catch(() => {});
}

// ── Логирование платежей ──────────────────────────────────────────────────────
async function logPayment(userId, username, gateway, event, amount, currency, orderId, invoiceId, status, rawPayload, ip) {
  return run(
    `INSERT INTO payment_logs (user_id, username, gateway, event, amount, currency, order_id, invoice_id, status, raw_payload, ip, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [userId||null, username||null, gateway, event, amount||null, currency||null,
     orderId||null, invoiceId||null, status||null,
     rawPayload ? JSON.stringify(rawPayload) : null, ip||null]
  ).catch(() => {});
}

// ── Логирование API запросов ──────────────────────────────────────────────────
async function logApi(userId, username, method, path, statusCode, durationMs, ip, userAgent, bodySize) {
  return run(
    `INSERT INTO api_logs (user_id, username, method, path, status_code, duration_ms, ip, user_agent, body_size, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [userId||null, username||null, method, path, statusCode||null,
     durationMs||null, ip||null, userAgent||null, bodySize||null]
  ).catch(() => {});
}

// ── Логирование ошибок ────────────────────────────────────────────────────────
async function logError(userId, errorType, message, stack, path, ip, details) {
  return run(
    `INSERT INTO error_logs (user_id, error_type, message, stack, path, ip, details, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [userId||null, errorType||'unknown', message||null,
     stack ? stack.slice(0,3000) : null, path||null, ip||null,
     details ? JSON.stringify(details) : null]
  ).catch(() => {});
}

// ── Логирование AI ────────────────────────────────────────────────────────────
async function logAi(context, model, promptLen, response, durationMs, success, error) {
  return run(
    `INSERT INTO ai_logs (context, model, prompt_len, response, duration_ms, success, error, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [context, model||'groq/llama3', promptLen||null,
     response ? response.slice(0,1000) : null,
     durationMs||null, success?1:0, error||null]
  ).catch(() => {});
}

// ── Логирование смены статуса сделки ─────────────────────────────────────────
async function logDealStatus(dealId, actorId, actorName, oldStatus, newStatus, note, ip) {
  return run(
    `INSERT INTO deal_status_logs (deal_id, actor_id, actor_name, old_status, new_status, note, ip, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [dealId, actorId||null, actorName||null, oldStatus||null, newStatus||null, note||null, ip||null]
  ).catch(() => {});
}

// ── Логирование просмотров страниц ───────────────────────────────────────────
async function logPageView(userId, sessionId, path, referrer, ip, userAgent) {
  return run(
    `INSERT INTO page_views (user_id, session_id, path, referrer, ip, user_agent, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [userId||null, sessionId||null, path||null, referrer||null, ip||null, userAgent||null]
  ).catch(() => {});
}

// ── Логирование поиска ────────────────────────────────────────────────────────
async function logSearch(userId, queryText, results, ip) {
  return run(
    `INSERT INTO search_logs (user_id, query, results, ip, created_at)
     VALUES ($1,$2,$3,$4,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
    [userId||null, queryText||null, results||0, ip||null]
  ).catch(() => {});
}

module.exports = {
  query, queryOne, queryAll, run, transaction, pool,
  initSchema, auditLog, saveNotification, snapshotDailyStats,
  logSession, logChat, logAction, logBot, logPayment,
  logApi, logError, logAi, logDealStatus, logPageView, logSearch,
};
