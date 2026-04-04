'use strict';
const https  = require('https');
const crypto = require('crypto');
const { queryOne, queryAll, run } = require('../models/db');

const TOKEN    = () => process.env.TELEGRAM_BOT_TOKEN || '';
const BASE_URL = () => process.env.BACKEND_URL || '';
const isAdmin  = (chatId) => String(chatId) === String(process.env.REPORT_CHAT_ID);

// ── Отправка сообщения ────────────────────────────────────────────────────────
function sendMessage(chatId, text, opts = {}) {
  const token = TOKEN();
  if (!token || !chatId) return Promise.resolve();
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: String(chatId), text, parse_mode: 'HTML', ...opts });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (r) => { r.resume(); resolve(); });
    req.on('error', () => resolve());
    req.setTimeout(8000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

// ── Запрос к Claude ───────────────────────────────────────────────────────────
function askClaude(system, userMsg) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Promise.resolve('AI временно недоступен.');
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: system,
      messages: [{ role: 'user', content: userMsg }],
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (r) => {
      let data = '';
      r.on('data', d => data += d);
      r.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            console.error('[Bot] Claude API error:', json.error);
            resolve('Сервис временно недоступен. Попробуйте позже.');
          } else {
            resolve(json?.content?.[0]?.text || 'Не могу ответить.');
          }
        } catch(e) {
          console.error('[Bot] Claude parse error:', e.message);
          resolve('Ошибка обработки ответа.');
        }
      });
      r.on('error', (e) => { resolve('Ошибка соединения.'); });
    });
    req.on('error', (e) => { resolve('Ошибка соединения.'); });
    req.setTimeout(30000, () => { req.destroy(); resolve('Время ожидания истекло.'); });
    req.write(body);
    req.end();
  });
}

// ── Регистрация webhook ───────────────────────────────────────────────────────
function setWebhook() {
  const token = TOKEN();
  const base  = BASE_URL();
  console.log('[Bot] setWebhook called. TOKEN exists:', !!token, 'BASE_URL:', base || '(empty)');
  if (!token || !base) {
    console.warn('[Bot] TELEGRAM_BOT_TOKEN или BACKEND_URL не заданы');
    return;
  }
  // FIX: railway.app содержит .app, но НЕ нужен prefix /_/backend (только Vercel)
  const prefix = base.includes('vercel') ? '/_/backend' : '';
  const webhookUrl = base + prefix + '/api/tg-webhook/' + token;
  console.log('[Bot] Registering webhook:', webhookUrl);
  const body = JSON.stringify({ url: webhookUrl, drop_pending_updates: true });
  const req = https.request({
    hostname: 'api.telegram.org',
    path: '/bot' + token + '/setWebhook',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, (r) => {
    let data = '';
    r.on('data', d => data += d);
    r.on('end', () => {
      try {
        const res = JSON.parse(data);
        if (res.ok) console.log('Telegram webhook: ' + webhookUrl);
        else console.error('[Bot] Webhook error:', res.description);
      } catch { console.error('[Bot] Webhook parse error'); }
    });
  });
  req.on('error', e => console.error('[Bot] setWebhook error:', e.message));
  req.write(body);
  req.end();
}

// ── Авто-уведомления (вызываются извне из cron/routes) ───────────────────────

// Вызвать при первом споре за день
async function notifyFirstDispute(deal) {
  const adminId = process.env.REPORT_CHAT_ID;
  if (!adminId) return;
  await sendMessage(adminId,
    '⚠️ <b>Первый спор за сегодня!</b>\n\n' +
    '🆔 Сделка: <code>' + deal.id + '</code>\n' +
    '💰 Сумма: $' + parseFloat(deal.amount || 0).toFixed(2) + '\n' +
    '👤 Товар: ' + (deal.title || '—') + '\n\n' +
    'Проверьте /ai_status для управления'
  ).catch(() => {});
}

// Вызвать если пользователь разместил 5+ товаров за час
async function notifySpamSeller(username, count) {
  const adminId = process.env.REPORT_CHAT_ID;
  if (!adminId) return;
  await sendMessage(adminId,
    '🚨 <b>Подозрительная активность!</b>\n\n' +
    '👤 @' + username + '\n' +
    '📦 Разместил <b>' + count + '</b> товаров за последний час\n\n' +
    'Возможный спам. Проверьте: /radar\n' +
    'Заморозить: <code>/freeze ' + username + '</code>'
  ).catch(() => {});
}

// Вызвать если сайт лёг (из monitor.js)
async function notifySiteDown(reason) {
  const adminId = process.env.REPORT_CHAT_ID;
  if (!adminId) return;
  await sendMessage(adminId,
    '🔴 <b>САЙТ НЕДОСТУПЕН!</b>\n\n' +
    '❗ Причина: ' + (reason || 'неизвестна') + '\n' +
    '🕐 ' + new Date().toLocaleString('ru') + '\n\n' +
    'Проверьте Railway dashboard'
  ).catch(() => {});
}

// ── Обработка входящего апдейта ───────────────────────────────────────────────
async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text   = msg.text.trim();

  // ── /start ────────────────────────────────────────────────────────────────
  if (text.startsWith('/start')) {
    const adminCmds = isAdmin(chatId)
      ? '\n\n🔧 <b>Админ:</b>\n• /report — отчёт\n• /monitor — проверка сайта\n• /top — топ продавцов и товаров\n• /radar — подозрительные юзеры\n• /dead — мёртвые товары\n• /vibe — настроение рынка AI\n• /predict — прогноз категорий AI\n• /freeze [логин] — заморозить\n• /msg [логин] [текст] — написать\n• /promo [код] [%] — промокод\n• /ai_on /ai_off /ai_status'
      : '';
    await sendMessage(chatId,
      '🟡 <b>Minions Market Bot</b>\n\n' +
      'Команды:\n' +
      '• /code [логин] — код для входа\n' +
      '• /reset [логин] — сброс пароля\n' +
      '• /quest — ежедневные задания\n' +
      '• /casino — попытать удачу\n' +
      '• /help — помощь' + adminCmds
    );
    return;
  }

  // ── /help ─────────────────────────────────────────────────────────────────
  if (text === '/help') {
    const adminCmds = isAdmin(chatId)
      ? '\n\n🔧 Команды администратора:\n/report /monitor /top /radar /dead\n/vibe /predict /freeze /msg /promo\n/ai_on /ai_off /ai_status'
      : '';
    await sendMessage(chatId,
      '🟡 <b>Minions Market — Помощь</b>\n\n' +
      '/code [логин] — код для регистрации\n' +
      '/reset [логин] — сброс пароля\n' +
      '/quest — ежедневные задания\n' +
      '/casino — мини-лотерея\n' +
      '/partner — партнёрская программа\n\n' +
      'По вопросам: @givi_hu' + adminCmds
    );
    return;
  }

  // ── /ai_on ────────────────────────────────────────────────────────────────
  if (text === '/ai_on') {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    try {
      const { setEnabled, isEnabled } = require('./aiAdmin');
      if (isEnabled()) { await sendMessage(chatId, '✅ AI Admin уже включён.'); }
      else { setEnabled(true); await sendMessage(chatId, '✅ <b>AI Admin включён!</b>'); }
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /ai_off ───────────────────────────────────────────────────────────────
  if (text === '/ai_off') {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    try {
      const { setEnabled, isEnabled } = require('./aiAdmin');
      if (!isEnabled()) { await sendMessage(chatId, '⏸ AI Admin уже выключен.'); }
      else { setEnabled(false); await sendMessage(chatId, '⏸ <b>AI Admin выключен.</b>'); }
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /ai_status ────────────────────────────────────────────────────────────
  if (text === '/ai_status') {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    try {
      const { isEnabled } = require('./aiAdmin');
      const status = isEnabled() ? '🟢 ВКЛЮЧЁН' : '🔴 ВЫКЛЮЧЕН';
      const pending  = await queryOne("SELECT COUNT(*) as c FROM deals WHERE status='pending'").catch(() => ({c:0}));
      const disputes = await queryOne("SELECT COUNT(*) as c FROM deals WHERE status='disputed'").catch(() => ({c:0}));
      const newProds = await queryOne("SELECT COUNT(*) as c FROM products WHERE status='active' AND (ai_moderated IS NULL OR ai_moderated=0)").catch(() => ({c:0}));
      await sendMessage(chatId,
        '🤖 <b>AI Admin — ' + status + '</b>\n\n' +
        '📋 Очередь:\n' +
        '• На модерации: ' + newProds.c + '\n' +
        '• Споров: ' + disputes.c + '\n' +
        '• Ожидают: ' + pending.c + '\n\n' +
        (isEnabled() ? 'Выключить: /ai_off' : 'Включить: /ai_on')
      );
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /report ───────────────────────────────────────────────────────────────
  if (text === '/report') {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    await sendMessage(chatId, '⏳ <b>Генерирую отчёт...</b>');
    try {
      const { sendHourlyReport } = require('./hourlyReport');
      await sendHourlyReport();
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: <code>' + e.message + '</code>'); }
    return;
  }

  // ── /monitor ──────────────────────────────────────────────────────────────
  if (text === '/monitor') {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    await sendMessage(chatId, '🔍 <b>Запускаю проверку сайта...</b>');
    try {
      const { runMonitor } = require('./monitor');
      await runMonitor();
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: <code>' + e.message + '</code>'); }
    return;
  }

  // ── /top — топ продавцов и товаров ────────────────────────────────────────
  if (text === '/top') {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    try {
      const sellers = await queryAll(
        "SELECT u.username, u.total_sales, u.rating, COUNT(p.id) as prods " +
        "FROM users u LEFT JOIN products p ON p.seller_id=u.id AND p.status='active' " +
        "GROUP BY u.id ORDER BY u.total_sales DESC LIMIT 5"
      ).catch(() => []);
      const products = await queryAll(
        "SELECT p.title, p.price, p.views, u.username " +
        "FROM products p LEFT JOIN users u ON u.id=p.seller_id " +
        "WHERE p.status='active' ORDER BY p.views DESC LIMIT 5"
      ).catch(() => []);
      const totalUsers  = await queryOne('SELECT COUNT(*) as c FROM users').catch(() => ({c:0}));
      const totalDeals  = await queryOne("SELECT COUNT(*) as c FROM deals WHERE status='completed'").catch(() => ({c:0}));
      const totalVolume = await queryOne("SELECT COALESCE(SUM(amount),0) as t FROM deals WHERE status='completed'").catch(() => ({t:0}));

      let msg = '📊 <b>Топ платформы</b>\n\n';
      msg += '👥 Пользователей: <b>' + totalUsers.c + '</b> | Сделок: <b>' + totalDeals.c + '</b> | Оборот: <b>$' + parseFloat(totalVolume.t).toFixed(0) + '</b>\n\n';

      msg += '🏆 <b>Топ продавцов:</b>\n';
      if (sellers.length === 0) {
        msg += 'Нет данных\n';
      } else {
        sellers.forEach((s, i) => {
          msg += (i+1) + '. @' + s.username + ' — ' + (s.total_sales||0) + ' продаж ⭐' + parseFloat(s.rating||5).toFixed(1) + ' 📦' + (s.prods||0) + '\n';
        });
      }

      msg += '\n👁 <b>Топ товаров по просмотрам:</b>\n';
      if (products.length === 0) {
        msg += 'Нет данных\n';
      } else {
        products.forEach((p, i) => {
          msg += (i+1) + '. ' + p.title.slice(0,30) + ' — $' + p.price + ' 👁' + (p.views||0) + '\n';
        });
      }

      await sendMessage(chatId, msg);
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /radar — подозрительные пользователи ─────────────────────────────────
  if (text === '/radar') {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    try {
      await sendMessage(chatId, '🔎 <b>Сканирую платформу...</b>');

      const now = Math.floor(Date.now() / 1000);
      const hour = now - 3600;
      const day  = now - 86400;

      // Новые юзеры с крупными сделками
      const newBigDeals = await queryAll(
        "SELECT u.username, u.created_at, d.amount, p.title " +
        "FROM deals d " +
        "JOIN users u ON u.id=d.buyer_id " +
        "JOIN products p ON p.id=d.product_id " +
        "WHERE u.created_at > $1 AND d.amount > 50 AND d.status IN ('active','pending') " +
        "ORDER BY d.amount DESC LIMIT 5",
        [day]
      ).catch(() => []);

      // Много споров
      const disputeProne = await queryAll(
        "SELECT u.username, COUNT(d.id) as cnt " +
        "FROM deals d JOIN users u ON (u.id=d.seller_id OR u.id=d.buyer_id) " +
        "WHERE d.status='disputed' " +
        "GROUP BY u.id HAVING COUNT(d.id) >= 2 " +
        "ORDER BY cnt DESC LIMIT 5"
      ).catch(() => []);

      // Спам-размещение товаров
      const spamSellers = await queryAll(
        "SELECT u.username, COUNT(p.id) as cnt " +
        "FROM products p JOIN users u ON u.id=p.seller_id " +
        "WHERE p.created_at > $1 " +
        "GROUP BY u.id HAVING COUNT(p.id) >= 3 " +
        "ORDER BY cnt DESC LIMIT 5",
        [hour]
      ).catch(() => []);

      let msg = '🔍 <b>Радар подозрительной активности</b>\n\n';

      if (newBigDeals.length > 0) {
        msg += '🆕💰 <b>Новые юзеры с крупными сделками:</b>\n';
        newBigDeals.forEach(r => {
          msg += '• @' + r.username + ' купил «' + (r.title||'?').slice(0,25) + '» за $' + r.amount + '\n';
        });
        msg += '\n';
      }

      if (disputeProne.length > 0) {
        msg += '⚠️ <b>Много споров:</b>\n';
        disputeProne.forEach(r => {
          msg += '• @' + r.username + ' — ' + r.cnt + ' споров\n';
        });
        msg += '\n';
      }

      if (spamSellers.length > 0) {
        msg += '🚨 <b>Спам-размещение (за час):</b>\n';
        spamSellers.forEach(r => {
          msg += '• @' + r.username + ' — ' + r.cnt + ' товаров\n';
        });
        msg += '\n';
      }

      if (newBigDeals.length === 0 && disputeProne.length === 0 && spamSellers.length === 0) {
        msg += '✅ Подозрительной активности не обнаружено.';
      } else {
        msg += 'Заморозить: <code>/freeze [логин]</code>';
      }

      await sendMessage(chatId, msg);
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /dead — мёртвые товары ────────────────────────────────────────────────
  if (text === '/dead') {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    try {
      const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
      const dead = await queryAll(
        "SELECT p.title, p.price, p.views, u.username, p.created_at " +
        "FROM products p JOIN users u ON u.id=p.seller_id " +
        "WHERE p.status='active' AND (p.views IS NULL OR p.views < 5) AND p.created_at < $1 " +
        "ORDER BY p.created_at ASC LIMIT 10",
        [weekAgo]
      ).catch(() => []);

      if (dead.length === 0) {
        await sendMessage(chatId, '✅ Мёртвых товаров нет — всё активно!');
        return;
      }

      let msg = '💀 <b>Мёртвые товары (7+ дней, <5 просмотров)</b>\n\n';
      dead.forEach((p, i) => {
        const days = Math.floor((Date.now()/1000 - p.created_at) / 86400);
        msg += (i+1) + '. ' + p.title.slice(0,28) + '\n';
        msg += '   @' + p.username + ' | $' + p.price + ' | 👁' + (p.views||0) + ' | ' + days + ' дн.\n';
      });
      msg += '\nРекомендую связаться с продавцами или скрыть нерелевантные товары.';

      await sendMessage(chatId, msg);
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /vibe — настроение рынка через AI ────────────────────────────────────
  if (text === '/vibe') {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    try {
      await sendMessage(chatId, '🎭 <b>Анализирую настроение рынка...</b>');

      const dayAgo = Math.floor(Date.now() / 1000) - 86400;

      const deals = await queryOne(
        "SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as vol " +
        "FROM deals WHERE created_at > $1", [dayAgo]
      ).catch(() => ({cnt:0, vol:0}));

      const disputes = await queryOne(
        "SELECT COUNT(*) as c FROM deals WHERE status='disputed' AND created_at > $1", [dayAgo]
      ).catch(() => ({c:0}));

      const newUsers = await queryOne(
        "SELECT COUNT(*) as c FROM users WHERE created_at > $1", [dayAgo]
      ).catch(() => ({c:0}));

      const newProds = await queryOne(
        "SELECT COUNT(*) as c FROM products WHERE created_at > $1", [dayAgo]
      ).catch(() => ({c:0}));

      const topCats = await queryAll(
        "SELECT category, COUNT(*) as c FROM deals d " +
        "JOIN products p ON p.id=d.product_id " +
        "WHERE d.created_at > $1 GROUP BY category ORDER BY c DESC LIMIT 3",
        [dayAgo]
      ).catch(() => []);

      const statsText =
        'За последние 24 часа на маркетплейсе:\n' +
        '- Сделок: ' + deals.cnt + ' на сумму $' + parseFloat(deals.vol).toFixed(2) + '\n' +
        '- Споров: ' + disputes.c + '\n' +
        '- Новых пользователей: ' + newUsers.c + '\n' +
        '- Новых товаров: ' + newProds.c + '\n' +
        (topCats.length > 0 ? '- Топ категории: ' + topCats.map(c => c.category + '(' + c.c + ')').join(', ') : '');

      const vibeText = await askClaude(
        'Ты аналитик маркетплейса игровых товаров. Отвечай ТОЛЬКО на русском. Будь кратким — максимум 5 предложений. Используй эмодзи. Оцени "настроение рынка" и дай 1 практический совет для владельца.',
        statsText
      );

      await sendMessage(chatId, '🎭 <b>Настроение рынка</b>\n\n' + vibeText);
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /predict — прогноз категорий через AI ────────────────────────────────
  if (text === '/predict') {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    try {
      await sendMessage(chatId, '🔮 <b>Строю прогноз...</b>');

      const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
      const cats = await queryAll(
        "SELECT p.category, COUNT(d.id) as sales, COALESCE(SUM(d.amount),0) as vol " +
        "FROM deals d JOIN products p ON p.id=d.product_id " +
        "WHERE d.created_at > $1 AND d.status='completed' " +
        "GROUP BY p.category ORDER BY sales DESC LIMIT 8",
        [weekAgo]
      ).catch(() => []);

      const views = await queryAll(
        "SELECT category, SUM(views) as v FROM products WHERE status='active' GROUP BY category ORDER BY v DESC LIMIT 5"
      ).catch(() => []);

      const statsText =
        'Продажи по категориям за 7 дней:\n' +
        (cats.length > 0 ? cats.map(c => c.category + ': ' + c.sales + ' продаж, $' + parseFloat(c.vol).toFixed(0)).join('\n') : 'нет данных') +
        '\n\nПросмотры товаров:\n' +
        (views.length > 0 ? views.map(v => v.category + ': ' + v.v + ' просмотров').join('\n') : 'нет данных');

      const prediction = await askClaude(
        'Ты аналитик маркетплейса игровых товаров. Отвечай ТОЛЬКО на русском. Будь конкретен. Формат: назови 3 категории-лидера следующей недели с коротким обоснованием. Затем 1 категория которую стоит продвинуть. Максимум 8 предложений.',
        statsText
      );

      await sendMessage(chatId, '🔮 <b>Прогноз на следующую неделю</b>\n\n' + prediction);
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /freeze [логин] — заморозить пользователя ────────────────────────────
  if (text.startsWith('/freeze')) {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    const username = text.split(/\s+/)[1]?.toLowerCase();
    if (!username) {
      await sendMessage(chatId, '❗ Укажите логин.\nПример: <code>/freeze username</code>');
      return;
    }
    try {
      const user = await queryOne('SELECT id, username, is_frozen FROM users WHERE username=$1', [username]);
      if (!user) { await sendMessage(chatId, '❌ Пользователь <b>' + username + '</b> не найден.'); return; }
      if (user.is_frozen) {
        await run('UPDATE users SET is_frozen=0 WHERE id=$1', [user.id]);
        await sendMessage(chatId, '✅ Пользователь @' + username + ' <b>разморожен</b>.');
      } else {
        await run('UPDATE users SET is_frozen=1 WHERE id=$1', [user.id]);
        await sendMessage(chatId, '🧊 Пользователь @' + username + ' <b>заморожен</b>.\n\nПовторите команду для разморозки.');
      }
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /msg [логин] [текст] — написать пользователю от платформы ────────────
  if (text.startsWith('/msg')) {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    const parts    = text.split(/\s+/);
    const username = parts[1]?.toLowerCase();
    const msgText  = parts.slice(2).join(' ');
    if (!username || !msgText) {
      await sendMessage(chatId, '❗ Формат: <code>/msg логин текст сообщения</code>');
      return;
    }
    try {
      const user = await queryOne('SELECT telegram_id, username FROM users WHERE username=$1', [username]);
      if (!user || !user.telegram_id) {
        await sendMessage(chatId, '❌ Пользователь <b>' + username + '</b> не найден или не привязал Telegram.');
        return;
      }
      await sendMessage(user.telegram_id,
        '📢 <b>Сообщение от Minions Market</b>\n\n' + msgText
      );
      await sendMessage(chatId, '✅ Сообщение отправлено @' + username + '.');
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /promo [код] [%] — создать промокод ──────────────────────────────────
  if (text.startsWith('/promo')) {
    if (!isAdmin(chatId)) { await sendMessage(chatId, '⛔ Нет доступа.'); return; }
    const parts   = text.split(/\s+/);
    const code    = (parts[1] || '').toUpperCase();
    const percent = parseInt(parts[2] || '0');
    if (!code || percent < 1 || percent > 100) {
      await sendMessage(chatId,
        '❗ Формат: <code>/promo КОД ПРОЦЕНТ</code>\n\nПример: <code>/promo SUMMER25 25</code>'
      );
      return;
    }
    try {
      const existing = await queryOne('SELECT id FROM promo_codes WHERE code=$1', [code]).catch(() => null);
      if (existing) {
        await sendMessage(chatId, '❌ Промокод <b>' + code + '</b> уже существует.');
        return;
      }
      const expires = Math.floor(Date.now() / 1000) + 30 * 86400; // 30 дней
      await run(
        'INSERT INTO promo_codes (id, code, discount_percent, expires_at, uses_left) VALUES ($1,$2,$3,$4,$5)',
        [crypto.randomUUID(), code, percent, expires, 100]
      ).catch(async () => {
        // Таблица может не существовать — создаём
        await run(
          'CREATE TABLE IF NOT EXISTS promo_codes (id TEXT PRIMARY KEY, code TEXT UNIQUE, discount_percent INTEGER, expires_at INTEGER, uses_left INTEGER, created_at INTEGER DEFAULT (strftime(\'%s\',\'now\')))'
        );
        await run(
          'INSERT INTO promo_codes (id, code, discount_percent, expires_at, uses_left) VALUES ($1,$2,$3,$4,$5)',
          [crypto.randomUUID(), code, percent, expires, 100]
        );
      });
      await sendMessage(chatId,
        '🎟 <b>Промокод создан!</b>\n\n' +
        'Код: <code>' + code + '</code>\n' +
        'Скидка: <b>' + percent + '%</b>\n' +
        'Активен: 30 дней\n' +
        'Использований: 100\n\n' +
        'Поделитесь с пользователями!'
      );
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /code ─────────────────────────────────────────────────────────────────
  if (text.startsWith('/code')) {
    const parts    = text.split(/\s+/);
    const username = (parts[1] || '').toLowerCase();
    if (!username || !/^[a-z0-9_]{3,24}$/.test(username)) {
      await sendMessage(chatId, '❗ Укажите логин.\n\nПример: <code>/code myusername</code>');
      return;
    }
    try {
      const existing = await queryOne('SELECT id, password, telegram_id FROM users WHERE username=$1', [username]);
      if (existing && existing.password) {
        await sendMessage(chatId, '❌ Логин <b>' + username + '</b> уже занят.');
        return;
      }
      const code    = String(Math.floor(100000 + Math.random() * 900000));
      const expires = Math.floor(Date.now() / 1000) + 10 * 60;
      const tgId    = String(chatId);
      if (existing) {
        await run('UPDATE users SET otp_code=$1, otp_expires=$2, otp_used=0, telegram_id=$3 WHERE id=$4', [code, expires, tgId, existing.id]);
      } else {
        const tgExists = await queryOne('SELECT username FROM users WHERE telegram_id=$1', [tgId]);
        if (tgExists) {
          await sendMessage(chatId, '❌ Этот Telegram уже привязан к <b>' + tgExists.username + '</b>.');
          return;
        }
        await run('INSERT INTO users (id, username, telegram_id, otp_code, otp_expires, otp_used) VALUES ($1,$2,$3,$4,$5,0)',
          [crypto.randomUUID(), username, tgId, code, expires]);
      }
      await sendMessage(chatId,
        '🔐 <b>Код подтверждения</b>\n\nЛогин: <b>' + username + '</b>\nКод: <code>' + code + '</code>\n\n⏱ 10 минут'
      );
    } catch(e) {
      console.error('[Bot] /code error:', e.message);
      await sendMessage(chatId, '❌ Ошибка. Попробуйте ещё раз.');
    }
    return;
  }

  // ── /reset ────────────────────────────────────────────────────────────────
  if (text.startsWith('/reset')) {
    const parts    = text.split(/\s+/);
    const username = (parts[1] || '').toLowerCase();
    if (!username) { await sendMessage(chatId, '❗ Укажите логин. Пример: <code>/reset myusername</code>'); return; }
    try {
      const user = await queryOne('SELECT * FROM users WHERE username=$1 AND telegram_id=$2', [username, String(chatId)]);
      if (!user) {
        await sendMessage(chatId, '❌ Пользователь <b>' + username + '</b> не найден или не привязан к этому Telegram.');
        return;
      }
      const code    = String(Math.floor(100000 + Math.random() * 900000));
      const expires = Math.floor(Date.now() / 1000) + 15 * 60;
      await run('UPDATE users SET reset_code=$1, reset_expires=$2 WHERE id=$3', [code, expires, user.id]);
      await sendMessage(chatId,
        '🔑 <b>Код сброса пароля</b>\n\nЛогин: <b>' + username + '</b>\nКод: <code>' + code + '</code>\n\n⏱ 15 минут'
      );
    } catch(e) {
      console.error('[Bot] /reset error:', e.message);
      await sendMessage(chatId, '❌ Ошибка. Попробуйте ещё раз.');
    }
    return;
  }

  // ── /casino — мини-лотерея ────────────────────────────────────────────────
  if (text === '/casino') {
    try {
      const user = await queryOne('SELECT * FROM users WHERE telegram_id=$1', [String(chatId)]).catch(() => null);
      if (!user) {
        await sendMessage(chatId, '❌ Только зарегистрированные пользователи могут играть.\n/code [логин] — зарегистрироваться');
        return;
      }
      if (parseFloat(user.balance || 0) < 1) {
        await sendMessage(chatId, '💸 Недостаточно средств. Минимальный баланс для участия: <b>$1.00</b>');
        return;
      }

      // Проверяем кулдаун (1 раз в 6 часов)
      const lastPlay = await queryOne(
        "SELECT created_at FROM casino_log WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",
        [user.id]
      ).catch(() => null);
      if (lastPlay) {
        const cooldown = 6 * 3600;
        const elapsed  = Math.floor(Date.now() / 1000) - lastPlay.created_at;
        if (elapsed < cooldown) {
          const left = cooldown - elapsed;
          const h = Math.floor(left / 3600);
          const m = Math.floor((left % 3600) / 60);
          await sendMessage(chatId, '⏳ Следующая попытка через <b>' + h + 'ч ' + m + 'мин</b>');
          return;
        }
      }

      // Игра: 3 символа
      const symbols = ['🍋', '🍋', '🍋', '🍒', '🍒', '🔔', '🔔', '⭐', '💎', '🃏'];
      const s1 = symbols[Math.floor(Math.random() * symbols.length)];
      const s2 = symbols[Math.floor(Math.random() * symbols.length)];
      const s3 = symbols[Math.floor(Math.random() * symbols.length)];

      let prize = 0;
      let result = '';

      if (s1 === s2 && s2 === s3) {
        if (s1 === '💎') { prize = 10; result = '💎 ДЖЕКПОТ! +$10.00!'; }
        else if (s1 === '⭐') { prize = 5; result = '⭐ СУПЕР! +$5.00!'; }
        else if (s1 === '🔔') { prize = 3; result = '🔔 ОТЛИЧНО! +$3.00!'; }
        else { prize = 2; result = '🎉 ВЫИГРЫШ! +$2.00!'; }
      } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        prize = 0.5;
        result = '✨ Пара! +$0.50';
      } else {
        prize = 0;
        result = '😅 Не повезло. Попробуй снова через 6 часов!';
      }

      if (prize > 0) {
        await run('UPDATE users SET balance=balance+$1 WHERE id=$2', [prize, user.id]);
      }

      // Логируем
      await run(
        'CREATE TABLE IF NOT EXISTS casino_log (id TEXT PRIMARY KEY, user_id TEXT, prize REAL, created_at INTEGER)'
      ).catch(() => {});
      await run(
        'INSERT INTO casino_log (id, user_id, prize, created_at) VALUES ($1,$2,$3,$4)',
        [crypto.randomUUID(), user.id, prize, Math.floor(Date.now() / 1000)]
      ).catch(() => {});

      await sendMessage(chatId,
        '🎰 <b>Minions Casino</b>\n\n' +
        '[ ' + s1 + ' | ' + s2 + ' | ' + s3 + ' ]\n\n' +
        result + '\n\n' +
        (prize > 0 ? '💰 Баланс: $' + (parseFloat(user.balance) + prize).toFixed(2) : 'Удачи в следующий раз!')
      );
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /quest — ежедневные задания ───────────────────────────────────────────
  if (text === '/quest') {
    try {
      const user = await queryOne('SELECT * FROM users WHERE telegram_id=$1', [String(chatId)]).catch(() => null);
      if (!user) {
        await sendMessage(chatId, '❌ Зарегистрируйтесь на сайте.\n/code [логин] — регистрация');
        return;
      }

      const todayStart = Math.floor(new Date().setHours(0,0,0,0) / 1000);

      // Считаем прогресс заданий за сегодня
      const dealsToday = await queryOne(
        "SELECT COUNT(*) as c FROM deals WHERE (buyer_id=$1 OR seller_id=$1) AND created_at > $2 AND status='completed'",
        [user.id, todayStart]
      ).catch(() => ({c:0}));

      const prodsToday = await queryOne(
        "SELECT COUNT(*) as c FROM products WHERE seller_id=$1 AND created_at > $2",
        [user.id, todayStart]
      ).catch(() => ({c:0}));

      const tasks = [
        {
          name: '💬 Заполни профиль',
          done: !!(user.avatar || user.bio),
          reward: '$0.50',
        },
        {
          name: '🛒 Совершить 1 сделку сегодня',
          done: dealsToday.c >= 1,
          reward: '$1.00',
        },
        {
          name: '📦 Разместить товар',
          done: prodsToday.c >= 1,
          reward: '$0.30',
        },
        {
          name: '🏆 3 сделки за день',
          done: dealsToday.c >= 3,
          reward: '$2.00',
        },
      ];

      const done  = tasks.filter(t => t.done).length;
      const total = tasks.length;
      const bar   = '▓'.repeat(done) + '░'.repeat(total - done);

      let msg = '📋 <b>Ежедневные задания</b>\n';
      msg += bar + ' ' + done + '/' + total + '\n\n';

      tasks.forEach(t => {
        msg += (t.done ? '✅' : '⬜') + ' ' + t.name + ' → <b>' + t.reward + '</b>\n';
      });

      msg += '\n💡 Выполняй задания — зарабатывай бонусы на баланс каждый день!';

      await sendMessage(chatId, msg);
    } catch(e) { await sendMessage(chatId, '❌ Ошибка: ' + e.message); }
    return;
  }

  // ── /partner ──────────────────────────────────────────────────────────────
  if (text === '/partner') {
    const user = await queryOne('SELECT * FROM users WHERE telegram_id=$1', [String(chatId)]).catch(() => null);
    if (!user) {
      await sendMessage(chatId, '❌ Сначала зарегистрируйтесь на сайте.\n/code [логин] — для регистрации');
      return;
    }
    if (user.is_partner) {
      const base = process.env.FRONTEND_URL || process.env.BACKEND_URL || '';
      await sendMessage(chatId,
        '✅ <b>Вы уже партнёр!</b>\n\n' +
        '🔗 Ваша ссылка:\n<code>' + base + '?ref=' + user.ref_code + '</code>\n\n' +
        '💰 Ваш процент: <b>' + user.partner_percent + '%</b> с каждой сделки реферала\n\n' +
        '/refstats — статистика рефералов'
      );
      return;
    }
    const percent = parseInt(process.env.PARTNER_PERCENT || '10');
    await sendMessage(chatId,
      '🤝 <b>Партнёрская программа Minions Market</b>\n\n' +
      'Условия сотрудничества:\n\n' +
      '• Вы получаете <b>' + percent + '%</b> с каждой завершённой сделки ваших рефералов\n' +
      '• Вознаграждение начисляется автоматически на баланс\n' +
      '• Вывод через CryptoBot в USDT\n' +
      '• Статистика в реальном времени через /refstats\n\n' +
      'Для подтверждения напишите: <b>/joinpartner да</b>'
    );
    return;
  }

  // ── /joinpartner ──────────────────────────────────────────────────────────
  if (text.toLowerCase().startsWith('/joinpartner')) {
    const confirm = text.split(/\s+/)[1]?.toLowerCase();
    if (confirm !== 'да') {
      await sendMessage(chatId, '❗ Для подтверждения напишите: /joinpartner да');
      return;
    }
    const user = await queryOne('SELECT * FROM users WHERE telegram_id=$1', [String(chatId)]).catch(() => null);
    if (!user) { await sendMessage(chatId, '❌ Сначала зарегистрируйтесь на сайте.'); return; }
    if (user.is_partner) { await sendMessage(chatId, '✅ Вы уже партнёр!'); return; }

    const refCode = user.username + '_' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const percent = parseInt(process.env.PARTNER_PERCENT || '10');
    await run('UPDATE users SET is_partner=1, ref_code=$1, partner_percent=$2 WHERE id=$3',
      [refCode, percent, user.id]);

    const base = process.env.FRONTEND_URL || process.env.BACKEND_URL || '';
    const refLink = base + '?ref=' + refCode;

    if (process.env.REPORT_CHAT_ID) {
      sendMessage(process.env.REPORT_CHAT_ID,
        '🤝 <b>Новый партнёр!</b>\n\n@' + user.username + '\nКод: ' + refCode + '\nПроцент: ' + percent + '%'
      ).catch(() => {});
    }

    await sendMessage(chatId,
      '🎉 <b>Добро пожаловать в партнёрскую программу!</b>\n\n' +
      '🔗 Ваша реферальная ссылка:\n<code>' + refLink + '</code>\n\n' +
      '💰 Ваш процент: <b>' + percent + '%</b> с каждой сделки\n\n' +
      'Поделитесь ссылкой — и зарабатывайте автоматически!\n\n' +
      '/refstats — ваша статистика'
    );
    return;
  }

  // ── /refstats ─────────────────────────────────────────────────────────────
  if (text === '/refstats') {
    const user = await queryOne('SELECT * FROM users WHERE telegram_id=$1', [String(chatId)]).catch(() => null);
    if (!user || !user.is_partner) {
      await sendMessage(chatId, '❌ Вы не являетесь партнёром.\n/partner — узнать об условиях');
      return;
    }
    const referred   = await queryOne('SELECT COUNT(*) as c FROM users WHERE ref_by=$1', [user.ref_code]).catch(() => ({c:0}));
    const earned     = await queryOne('SELECT COALESCE(SUM(amount),0) as t FROM referral_rewards WHERE partner_id=$1', [user.id]).catch(() => ({t:0}));
    const lastRewards = await queryAll('SELECT amount, created_at FROM referral_rewards WHERE partner_id=$1 ORDER BY created_at DESC LIMIT 5', [user.id]).catch(() => []);

    const base = process.env.FRONTEND_URL || process.env.BACKEND_URL || '';
    await sendMessage(chatId,
      '📊 <b>Ваша статистика</b>\n\n' +
      '🔗 Ссылка: <code>' + base + '?ref=' + user.ref_code + '</code>\n' +
      '👥 Зарегистрировалось: <b>' + referred.c + '</b> человек\n' +
      '💰 Заработано всего: <b>$' + parseFloat(earned.t).toFixed(2) + '</b>\n' +
      '💳 Баланс: <b>$' + parseFloat(user.balance || 0).toFixed(2) + '</b>\n' +
      '📈 Ваш процент: <b>' + user.partner_percent + '%</b>\n\n' +
      (lastRewards.length > 0
        ? '🕐 Последние начисления:\n' + lastRewards.map(r => '  +$' + parseFloat(r.amount).toFixed(2) + ' · ' + new Date(r.created_at * 1000).toLocaleDateString('ru')).join('\n')
        : 'Сделок по рефералам ещё нет.')
    );
    return;
  }

  // ── Свободный чат с AI ────────────────────────────────────────────────────
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      await sendMessage(chatId, 'AI временно недоступен. Используйте /help для списка команд.');
      return;
    }

    await sendMessage(chatId, '⏳ Отвечаю...');

    const user = await queryOne(
      'SELECT id, username, balance, frozen_balance, total_sales, total_purchases, rating FROM users WHERE telegram_id=$1',
      [String(chatId)]
    ).catch(() => null);

    let userContext = '';
    if (user) {
      const myProducts = await queryAll(
        "SELECT title, price FROM products WHERE seller_id=$1 AND status='active' LIMIT 10",
        [user.id]
      ).catch(() => []);
      const myDeals = await queryAll(
        "SELECT d.status, p.title, d.amount FROM deals d LEFT JOIN products p ON p.id=d.product_id WHERE (d.buyer_id=$1 OR d.seller_id=$1) AND d.status IN ('active','pending') ORDER BY d.created_at DESC LIMIT 5",
        [user.id]
      ).catch(() => []);
      userContext = 'Пользователь: @' + user.username + '\n' +
        'Баланс: $' + parseFloat(user.balance || 0).toFixed(2) + '\n' +
        'Заморожено: $' + parseFloat(user.frozen_balance || 0).toFixed(2) + '\n' +
        'Продаж: ' + (user.total_sales || 0) + ' | Покупок: ' + (user.total_purchases || 0) + '\n' +
        'Рейтинг: ' + (user.rating || 5.0);
      if (myProducts.length > 0) {
        userContext += '\n\nМои активные товары:\n' + myProducts.map(p => '- ' + p.title + ' ($' + p.price + ')').join('\n');
      }
      if (myDeals.length > 0) {
        userContext += '\n\nМои активные сделки:\n' + myDeals.map(d => '- ' + (d.title || '?') + ' $' + d.amount + ' (' + d.status + ')').join('\n');
      }
    } else {
      userContext = 'Пользователь не зарегистрирован на платформе.';
    }

    let catalogContext = '';
    if (text.length > 3) {
      const found = await queryAll(
        "SELECT title, price FROM products WHERE status='active' AND (LOWER(title) LIKE $1 OR LOWER(category) LIKE $1) LIMIT 5",
        ['%' + text.toLowerCase().slice(0, 30) + '%']
      ).catch(() => []);
      if (found.length > 0) {
        catalogContext = '\n\nТовары в каталоге по запросу:\n' + found.map(p => '- ' + p.title + ' за $' + p.price).join('\n');
      }
    }

    const isOwner = isAdmin(chatId);
    const systemPrompt = isOwner
      ? 'Ты умный AI-ассистент хозяина маркетплейса Minions Market (игровые товары, аккаунты, валюта). Общайся свободно и естественно по-русски. Помогай с вопросами о сайте, бизнесе, статистике.'
      : 'Ты помощник маркетплейса Minions Market. Общайся дружелюбно по-русски.\n\nПРАВИЛА:\n- Показывай только данные ЭТОГО пользователя\n- Никогда не раскрывай данные других\n- На вопросы не по теме сайта: "Я помогаю только по вопросам маркетплейса"\n\nО платформе: игровые товары, комиссия 5%, эскроу защита, пополнение RuKassa/CryptoPay.';

    const answer = await askClaude(systemPrompt, userContext + catalogContext + '\n\nСообщение: ' + text);
    await sendMessage(chatId, answer);

    if (!isOwner && process.env.REPORT_CHAT_ID) {
      sendMessage(process.env.REPORT_CHAT_ID,
        '💬 <b>@' + (user ? user.username : chatId) + '</b>\n❓ ' + text.slice(0, 100) + '\n🤖 ' + answer.slice(0, 100)
      ).catch(() => {});
    }
  } catch(e) {
    console.error('[Bot] chat error:', e.message);
    await sendMessage(chatId, 'Произошла ошибка. Попробуйте ещё раз.');
  }
}

// ── Публичный интерфейс ───────────────────────────────────────────────────────
function getBot() {
  setWebhook();
  return { username: process.env.BOT_USERNAME || '' };
}

module.exports = {
  getBot,
  handleUpdate,
  sendMessage,
  setWebhook,
  notifyFirstDispute,
  notifySpamSeller,
  notifySiteDown,
};
