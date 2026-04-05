/**
 * 🔴 LIVE WebSocket Events — Minions Market
 *
 * Реалтайм поток событий для админ-панели:
 *   - Новые пользователи
 *   - Новые сделки
 *   - Споры
 *   - Пополнения кошелька
 *   - Новые товары
 *
 * Подключение: require('./utils/wsEvents').initWs(server)
 * Отправка:    require('./utils/wsEvents').broadcast('deal_created', { ... })
 */

'use strict';

const { WebSocketServer } = require('ws');

let wss = null;

// Подключённые админ-клиенты: Set<ws>
const adminClients = new Set();

/**
 * Инициализировать WS-сервер на существующем HTTP-сервере
 * @param {import('http').Server} httpServer
 */
function initWs(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws/admin' });

  wss.on('connection', (ws, req) => {
    // Простая проверка токена — передаётся как ?token=XXX
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    const adminToken = process.env.ADMIN_WS_TOKEN || process.env.JWT_SECRET || '';
    if (!token || token !== adminToken) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    adminClients.add(ws);
    console.log(`[WS] Админ подключился. Всего: ${adminClients.size}`);

    // Пинг каждые 30 секунд чтобы не дропало соединение
    const ping = setInterval(() => {
      if (ws.readyState === ws.OPEN) ws.ping();
    }, 30000);

    ws.on('close', () => {
      adminClients.delete(ws);
      clearInterval(ping);
      console.log(`[WS] Админ отключился. Всего: ${adminClients.size}`);
    });

    ws.on('error', () => {
      adminClients.delete(ws);
      clearInterval(ping);
    });

    // Отправляем приветственное сообщение
    safeSend(ws, { type: 'connected', ts: Date.now(), clients: adminClients.size });
  });

  console.log('[WS] WebSocket сервер запущен на /ws/admin');
}

function safeSend(ws, data) {
  try {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Разослать событие всем подключённым админам
 * @param {string} type   Тип события: 'user_registered' | 'deal_created' | 'deal_disputed' | 'deposit_completed' | 'product_created' | 'deal_completed'
 * @param {object} payload Данные события
 */
function broadcast(type, payload = {}) {
  if (!adminClients.size) return;
  const msg = JSON.stringify({ type, payload, ts: Date.now() });
  for (const ws of adminClients) {
    try {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    } catch (e) {
      adminClients.delete(ws);
    }
  }
}

module.exports = { initWs, broadcast };
