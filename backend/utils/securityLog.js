'use strict';
const { run, queryAll, logSession, logAction, logBot, logPayment, logApi, logError, logAi, logDealStatus, logPageView, logSearch } = require('../models/db');

// ── Все события ───────────────────────────────────────────────────────────────
const EVENTS = {
  // Аутентификация
  LOGIN_OK:           'login_ok',
  LOGIN_FAIL:         'login_fail',
  LOGOUT:             'logout',
  REGISTER:           'register',
  TG_LOGIN:           'tg_login',
  TG_REGISTER:        'tg_register',
  ADMIN_LOGIN_OK:     'admin_login_ok',
  ADMIN_LOGIN_FAIL:   'admin_login_fail',
  ADMIN_TG_LOGIN:     'admin_tg_login',
  ADMIN_LOGOUT:       'admin_logout',
  TOKEN_INVALID:      'token_invalid',
  TOKEN_EXPIRED:      'token_expired',
  BANNED_ACCESS:      'banned_access',
  TWO_FA_REQUEST:     '2fa_request',
  TWO_FA_OK:          '2fa_ok',
  TWO_FA_FAIL:        '2fa_fail',
  // Пароли
  RESET_CODE:         'reset_code',
  RESET_OK:           'reset_ok',
  RESET_FAIL:         'reset_fail',
  PASSWORD_CHANGE:    'password_change',
  // Профиль
  PROFILE_UPDATE:     'profile_update',
  AVATAR_CHANGE:      'avatar_change',
  // Товары
  PRODUCT_CREATE:     'product_create',
  PRODUCT_UPDATE:     'product_update',
  PRODUCT_DELETE:     'product_delete',
  PRODUCT_VIEW:       'product_view',
  PRODUCT_PROMOTE:    'product_promote',
  // Сделки
  DEAL_CREATE:        'deal_create',
  DEAL_CONFIRM:       'deal_confirm',
  DEAL_COMPLETE:      'deal_complete',
  DEAL_DISPUTE:       'deal_dispute',
  DEAL_REFUND:        'deal_refund',
  DEAL_CANCEL:        'deal_cancel',
  DEAL_MESSAGE:       'deal_message',
  // Платежи
  DEPOSIT_INIT:       'deposit_init',
  DEPOSIT_OK:         'deposit_ok',
  DEPOSIT_FAIL:       'deposit_fail',
  WITHDRAW_REQUEST:   'withdraw_request',
  WITHDRAW_OK:        'withdraw_ok',
  WITHDRAW_FAIL:      'withdraw_fail',
  BALANCE_ADJUST:     'balance_adjust',
  // Чаты
  MESSAGE_SEND:       'message_send',
  MESSAGE_READ:       'message_read',
  // Безопасность
  IP_BLOCKED:         'ip_blocked',
  BRUTE_FORCE:        'brute_force',
  SUSPICIOUS:         'suspicious',
  BAN:                'ban',
  UNBAN:              'unban',
  // Поиск
  SEARCH:             'search',
  // Бот
  BOT_MESSAGE_IN:     'bot_msg_in',
  BOT_MESSAGE_OUT:    'bot_msg_out',
  BOT_COMMAND:        'bot_command',
  // Ошибки
  ERROR_SERVER:       'error_server',
  ERROR_AUTH:         'error_auth',
  // Прочее
  PURCHASE:           'purchase',
  WITHDRAW:           'withdraw',
  DISPUTE:            'dispute',
  FAVORITE_ADD:       'favorite_add',
  FAVORITE_REMOVE:    'favorite_remove',
  REVIEW_CREATE:      'review_create',
  CASINO:             'casino',
  REFERRAL:           'referral',
};

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['cf-connecting-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}

function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

function getPlatform(req) {
  const ua = getUserAgent(req);
  if (ua.includes('TelegramBot') || req.headers['x-tg-app']) return 'telegram';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) return 'mobile';
  return 'web';
}

// ── Основной security_log (совместимость) ─────────────────────────────────────
async function log(event, req, { userId, username, details } = {}) {
  const ip = getIp(req);
  const ua = getUserAgent(req);
  const platform = getPlatform(req);

  try {
    await run(
      `INSERT INTO security_logs (event, ip, user_id, username, details) VALUES ($1,$2,$3,$4,$5)`,
      [event, ip, userId || null, username || null, details ? JSON.stringify(details) : null]
    );
  } catch(e) {
    console.error('[securityLog] failed:', e.message);
  }

  // Дополнительно пишем в session_logs для событий сессии
  const sessionEvents = [
    EVENTS.LOGIN_OK, EVENTS.LOGIN_FAIL, EVENTS.LOGOUT,
    EVENTS.REGISTER, EVENTS.TG_LOGIN, EVENTS.TG_REGISTER,
    EVENTS.ADMIN_LOGIN_OK, EVENTS.ADMIN_LOGIN_FAIL, EVENTS.ADMIN_TG_LOGIN, EVENTS.ADMIN_LOGOUT,
    EVENTS.TOKEN_INVALID, EVENTS.BANNED_ACCESS, EVENTS.TWO_FA_OK, EVENTS.TWO_FA_FAIL,
  ];
  if (sessionEvents.includes(event)) {
    logSession(userId, username, details?.telegram_id || null, event, platform, ip, ua, details).catch(() => {});
  }

  // Action logs для действий
  const actionEvents = [
    EVENTS.PRODUCT_CREATE, EVENTS.PRODUCT_UPDATE, EVENTS.PRODUCT_DELETE,
    EVENTS.DEAL_CREATE, EVENTS.DEAL_CONFIRM, EVENTS.DEAL_COMPLETE,
    EVENTS.DEAL_DISPUTE, EVENTS.DEAL_REFUND, EVENTS.DEAL_CANCEL,
    EVENTS.PROFILE_UPDATE, EVENTS.BALANCE_ADJUST, EVENTS.BAN, EVENTS.UNBAN,
    EVENTS.FAVORITE_ADD, EVENTS.FAVORITE_REMOVE, EVENTS.REVIEW_CREATE,
    EVENTS.WITHDRAW_REQUEST, EVENTS.DEPOSIT_INIT, EVENTS.CASINO,
  ];
  if (actionEvents.includes(event)) {
    logAction(userId, username, event,
      details?.entity || null, details?.entityId || null,
      details?.oldValue || null, details?.newValue || null,
      ip, platform, details
    ).catch(() => {});
  }

  // Search logs
  if (event === EVENTS.SEARCH) {
    logSearch(userId, details?.query, details?.results, ip).catch(() => {});
  }

  // Консоль Railway
  const ts = new Date().toISOString();
  console.log(`[SECURITY] ${ts} | ${event} | ip=${ip} | user=${username||userId||'—'} | ${details ? JSON.stringify(details) : ''}`);
}

// ── Специализированные логгеры ────────────────────────────────────────────────

// Логировать сообщение чата (direct или deal)
async function logChatMessage(senderId, receiverId, senderName, receiverName, messageId, text, image, context, dealId) {
  const { logChat } = require('../models/db');
  return logChat(senderId, receiverId, senderName, receiverName, messageId, text, image, context, dealId);
}

// Логировать входящее сообщение бота
async function logBotIn(telegramId, username, text, command, details) {
  return logBot(telegramId, username, 'in', command ? 'command' : 'text', text, command, null, details);
}

// Логировать исходящее сообщение бота
async function logBotOut(telegramId, username, responseText, details) {
  return logBot(telegramId, username, 'out', 'text', null, null, responseText, details);
}

// Логировать API запрос (middleware)
function apiLogMiddleware(req, res, next) {
  const start = Date.now();
  const ip    = getIp(req);
  const ua    = getUserAgent(req);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const skip = ['/api/tg-webhook', '/health', '/favicon'].some(p => req.path.startsWith(p));
    if (!skip) {
      logApi(
        req.userId || null,
        req.user?.username || null,
        req.method,
        req.path,
        res.statusCode,
        duration,
        ip, ua,
        req.headers['content-length'] ? parseInt(req.headers['content-length']) : null
      );
    }
  });
  next();
}

// Логировать смену статуса сделки
async function logDeal(dealId, actorId, actorName, oldStatus, newStatus, note, ip) {
  return logDealStatus(dealId, actorId, actorName, oldStatus, newStatus, note, ip);
}

// Логировать платёж
async function logPay(userId, username, gateway, event, amount, currency, orderId, invoiceId, status, rawPayload, ip) {
  return logPayment(userId, username, gateway, event, amount, currency, orderId, invoiceId, status, rawPayload, ip);
}

// Логировать ошибку сервера
async function logErr(userId, errorType, message, stack, path, ip, details) {
  return logError(userId, errorType, message, stack, path, ip, details);
}

// Логировать AI запрос
async function logAiCall(context, model, promptLen, response, durationMs, success, error) {
  return logAi(context, model, promptLen, response, durationMs, success, error);
}

// Логировать просмотр страницы
async function logPage(userId, sessionId, path, referrer, ip, ua) {
  return logPageView(userId, sessionId, path, referrer, ip, ua);
}

async function getRecentLogs({ limit = 200, event, ip } = {}) {
  let where = 'WHERE 1=1';
  const params = [];
  if (event) { params.push(event); where += ` AND event = $${params.length}`; }
  if (ip)    { params.push(ip);    where += ` AND ip = $${params.length}`; }
  params.push(limit);
  return queryAll(
    `SELECT * FROM security_logs ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
}

module.exports = {
  log, getIp, getUserAgent, getPlatform, getRecentLogs, EVENTS,
  logChatMessage, logBotIn, logBotOut,
  apiLogMiddleware, logDeal, logPay, logErr, logAiCall, logPage,
};
