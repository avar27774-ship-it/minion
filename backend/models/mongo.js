/**
 * 🍃 MongoDB — дополнительная БД для логов и аналитики
 *
 * PostgreSQL = основная БД (пользователи, сделки, балансы, товары)
 * MongoDB    = логи, аналитика, события, история чатов, аудит
 *
 * Подключение:
 *   require('./models/mongo').connectMongo()  — в server.js
 *
 * Использование:
 *   const { collections } = require('./models/mongo')
 *   await collections.eventLogs.insertOne({ type: 'deal_created', ... })
 *
 * .env переменная:
 *   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/minions
 */

'use strict';

const { MongoClient } = require('mongodb');

let client = null;
let db     = null;

// Все коллекции MongoDB
const collections = {
  // 📊 Аналитика событий (реалтайм лента для WS)
  eventLogs:     null,   // deal_created, user_registered, deposit и т.д.

  // 📋 Аудит действий (каждый запрос/действие юзера)
  actionLogs:    null,

  // 💬 Полная история чатов
  chatLogs:      null,

  // 🤖 Лог бота
  botLogs:       null,

  // 💳 Лог платежей
  paymentLogs:   null,

  // 🔒 Лог сессий (вход/выход)
  sessionLogs:   null,

  // 🚨 Лог ошибок
  errorLogs:     null,

  // 🧠 Лог AI запросов
  aiLogs:        null,

  // 🔍 Поисковые запросы
  searchLogs:    null,

  // 📱 Просмотры страниц (фронтенд)
  pageViews:     null,

  // 📦 История изменений статусов сделок
  dealEvents:    null,
};

/**
 * Подключиться к MongoDB. Вызывать один раз при старте сервера.
 */
async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI не задан — MongoDB отключена. Логи пишутся только в PostgreSQL.');
    return false;
  }

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });

    await client.connect();
    db = client.db(); // имя БД берётся из URI или можно задать: client.db('minions')

    // Привязываем коллекции
    collections.eventLogs   = db.collection('event_logs');
    collections.actionLogs  = db.collection('action_logs');
    collections.chatLogs    = db.collection('chat_logs');
    collections.botLogs     = db.collection('bot_logs');
    collections.paymentLogs = db.collection('payment_logs');
    collections.sessionLogs = db.collection('session_logs');
    collections.errorLogs   = db.collection('error_logs');
    collections.aiLogs      = db.collection('ai_logs');
    collections.searchLogs  = db.collection('search_logs');
    collections.pageViews   = db.collection('page_views');
    collections.dealEvents  = db.collection('deal_events');

    // Создаём TTL-индексы — логи автоудаляются через 90 дней
    await _createIndexes();

    console.log('✅ MongoDB подключена');
    return true;
  } catch (e) {
    console.error('[MongoDB] Ошибка подключения:', e.message);
    console.warn('[MongoDB] Продолжаем без MongoDB — основная БД (PostgreSQL) работает нормально.');
    return false;
  }
}

async function _createIndexes() {
  const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 дней

  const tasks = [
    // TTL индексы — автоудаление старых логов
    collections.eventLogs.createIndex(   { createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }),
    collections.actionLogs.createIndex(  { createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }),
    collections.chatLogs.createIndex(    { createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }),
    collections.botLogs.createIndex(     { createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }),
    collections.paymentLogs.createIndex( { createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }),
    collections.sessionLogs.createIndex( { createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }),
    collections.errorLogs.createIndex(   { createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }),
    collections.aiLogs.createIndex(      { createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }),
    collections.searchLogs.createIndex(  { createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }),
    collections.pageViews.createIndex(   { createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }),
    collections.dealEvents.createIndex(  { createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }),

    // Индексы для поиска по userId
    collections.actionLogs.createIndex(  { userId: 1, createdAt: -1 }),
    collections.chatLogs.createIndex(    { senderId: 1, createdAt: -1 }),
    collections.chatLogs.createIndex(    { receiverId: 1, createdAt: -1 }),
    collections.chatLogs.createIndex(    { dealId: 1 }),
    collections.botLogs.createIndex(     { telegramId: 1, createdAt: -1 }),
    collections.paymentLogs.createIndex( { userId: 1, gateway: 1, createdAt: -1 }),
    collections.sessionLogs.createIndex( { userId: 1, createdAt: -1 }),
    collections.sessionLogs.createIndex( { ip: 1, createdAt: -1 }),
    collections.errorLogs.createIndex(   { errorType: 1, createdAt: -1 }),
    collections.searchLogs.createIndex(  { query: 'text' }),
    collections.dealEvents.createIndex(  { dealId: 1, createdAt: -1 }),
    collections.eventLogs.createIndex(   { type: 1, createdAt: -1 }),
  ];

  await Promise.allSettled(tasks); // allSettled — не падаем если индекс уже есть
  console.log('[MongoDB] Индексы готовы');
}

/**
 * Проверить подключение
 */
function isConnected() {
  return !!db;
}

/**
 * Безопасная вставка — если MongoDB недоступна, тихо игнорируем
 */
async function safeInsert(collectionName, doc) {
  const col = collections[collectionName];
  if (!col) return null;
  try {
    return await col.insertOne({ ...doc, createdAt: new Date() });
  } catch (e) {
    // Никогда не роняем основной запрос из-за ошибки лога
    console.error(`[MongoDB] safeInsert(${collectionName}) error:`, e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Хелперы логирования — удобные функции для вызова из роутов
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Записать событие (для WS-ленты и аналитики)
 * type: 'deal_created' | 'user_registered' | 'deposit_completed' | 'deal_disputed' | 'deal_completed' | 'product_created'
 */
function logEvent(type, payload = {}) {
  return safeInsert('eventLogs', { type, payload });
}

/**
 * Лог действия пользователя
 */
function logAction(userId, username, action, entity, entityId, details, ip) {
  return safeInsert('actionLogs', { userId, username, action, entity, entityId, details, ip });
}

/**
 * Лог сообщения в чате
 */
function logChat(senderId, receiverId, senderName, receiverName, messageId, text, image, context, dealId) {
  return safeInsert('chatLogs', {
    senderId, receiverId, senderName, receiverName,
    messageId, text, image, context: context || 'direct', dealId,
  });
}

/**
 * Лог Telegram бота
 */
function logBot(telegramId, username, direction, text, command, response) {
  return safeInsert('botLogs', { telegramId: String(telegramId || ''), username, direction, text, command, response });
}

/**
 * Лог платежа
 */
function logPayment(userId, username, gateway, event, amount, currency, orderId, status, rawPayload, ip) {
  return safeInsert('paymentLogs', { userId, username, gateway, event, amount, currency, orderId, status, rawPayload, ip });
}

/**
 * Лог сессии (вход/выход)
 */
function logSession(userId, username, telegramId, event, platform, ip, userAgent) {
  const device = userAgent
    ? (userAgent.includes('Mobile') ? 'mobile' : 'desktop')
    : 'unknown';
  return safeInsert('sessionLogs', { userId, username, telegramId, event, platform: platform || 'web', ip, userAgent, device });
}

/**
 * Лог ошибки
 */
function logError(userId, errorType, message, stack, path, ip) {
  return safeInsert('errorLogs', { userId, errorType: errorType || 'unknown', message, stack: stack?.slice(0, 3000), path, ip });
}

/**
 * Лог AI запроса
 */
function logAi(context, model, response, durationMs, success, error) {
  return safeInsert('aiLogs', { context, model, response: response?.slice(0, 1000), durationMs, success: !!success, error });
}

/**
 * Лог поиска
 */
function logSearch(userId, queryText, results, ip) {
  return safeInsert('searchLogs', { userId, query: queryText, results: results || 0, ip });
}

/**
 * Лог просмотра страницы
 */
function logPageView(userId, sessionId, path, referrer, ip, userAgent) {
  return safeInsert('pageViews', { userId, sessionId, path, referrer, ip, userAgent });
}

/**
 * Лог события сделки (смена статуса)
 */
function logDealEvent(dealId, actorId, actorName, oldStatus, newStatus, note) {
  return safeInsert('dealEvents', { dealId, actorId, actorName, oldStatus, newStatus, note });
}

/**
 * Получить последние события (для WS или дашборда)
 */
async function getRecentEvents(limit = 50) {
  if (!collections.eventLogs) return [];
  try {
    return await collections.eventLogs
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  } catch (e) {
    return [];
  }
}

/**
 * Получить статистику по событиям за период
 */
async function getEventStats(fromDate, toDate) {
  if (!collections.eventLogs) return {};
  try {
    const pipeline = [
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ];
    const result = await collections.eventLogs.aggregate(pipeline).toArray();
    return Object.fromEntries(result.map(r => [r._id, r.count]));
  } catch (e) {
    return {};
  }
}

/**
 * Поиск по чатам (полнотекстовый)
 */
async function searchChats(query, limit = 20) {
  if (!collections.chatLogs) return [];
  try {
    return await collections.chatLogs
      .find({ $text: { $search: query } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  } catch (e) {
    return [];
  }
}

/**
 * Закрыть соединение (для graceful shutdown)
 */
async function closeMongo() {
  if (client) {
    await client.close();
    console.log('[MongoDB] Соединение закрыто');
  }
}

module.exports = {
  connectMongo,
  closeMongo,
  isConnected,
  collections,
  safeInsert,
  // Хелперы
  logEvent,
  logAction,
  logChat,
  logBot,
  logPayment,
  logSession,
  logError,
  logAi,
  logSearch,
  logPageView,
  logDealEvent,
  // Аналитика
  getRecentEvents,
  getEventStats,
  searchChats,
};
