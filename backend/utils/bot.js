/**
 * Telegram Bot — Minions Market
 * Поддерживает: /start /help /code /reset /report /ai_on /ai_off /ai_status
 */

const https  = require('https');
const crypto = require('crypto');
const { queryOne, run } = require('../models/db');

const TOKEN    = () => process.env.TELEGRAM_BOT_TOKEN || '';
const BASE_URL = () => process.env.BACKEND_URL || '';
const isAdmin  = (chatId) => String(chatId) === String(process.env.REPORT_CHAT_ID);

// ─────────────────────────────────────────────────────────────────────────────
// Отправка сообщения
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Регистрация webhook
// ─────────────────────────────────────────────────────────────────────────────

function setWebhook() {
  const token = TOKEN();
  const base  = BASE_URL();
  if (!token || !base) {
    console.warn('[Bot] TELEGRAM_BOT_TOKEN или BACKEND_URL не заданы — бот не запущен');
    return;
  }
  const webhookUrl = `${base}/api/tg-webhook/${token}`;
  const body = JSON.stringify({ url: webhookUrl, drop_pending_updates: true });
  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${token}/setWebhook`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, (r) => {
    let data = '';
    r.on('data', d => data += d);
    r.on('end', () => {
      try {
        const res = JSON.parse(data);
        if (res.ok) console.log(`✅ Telegram webhook: ${webhookUrl}`);
        else console.error('[Bot] Webhook error:', res.description);
      } catch { console.error('[Bot] Webhook parse error'); }
    });
  });
  req.on('error', e => console.error('[Bot] setWebhook error:', e.message));
  req.write(body);
  req.end();
}

// ─────────────────────────────────────────────────────────────────────────────
// Обработка входящего апдейта
// ─────────────────────────────────────────────────────────────────────────────

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text   = msg.text.trim();

  // ── /start ────────────────────────────────────────────────────────────────
  if (text.startsWith('/start')) {
    const adminCommands = isAdmin(chatId)
      ? `\n• /report — часовой отчёт\n• /ai_on — включить AI\n• /ai_off — выключить AI\n• /ai_status — статус AI`
      : '';
    await sendMessage(chatId,
      `🟡 <b>Minions Market Bot</b>\n\n` +
      `Команды:\n` +
      `• /code [логин] — код для входа/регистрации\n` +
      `• /reset [логин] — сбросить пароль\n` +
      `• /help — помощь` +
      adminCommands
    );
    return;
  }

  // ── /help ─────────────────────────────────────────────────────────────────
  if (text === '/help') {
    const adminCommands = isAdmin(chatId)
      ? `\n\n🔧 <b>Команды администратора:</b>\n/report — часовой отчёт\n/ai_on — включить AI Admin\n/ai_off — выключить AI Admin\n/ai_status — статус AI Admin`
      : '';
    await sendMessage(chatId,
      `🟡 <b>Minions Market — Помощь</b>\n\n` +
      `/code [логин] — код для регистрации\n` +
      `/reset [логин] — сброс пароля\n\n` +
      `По вопросам: @givi_hu` +
      adminCommands
    );
    return;
  }

  // ── /ai_on — включить ИИ (только админ) ──────────────────────────────────
  if (text === '/ai_on') {
    if (!isAdmin(chatId)) {
      await sendMessage(chatId, `⛔ Нет доступа.`);
      return;
    }
    const { setEnabled, isEnabled } = require('./aiAdmin');
    if (isEnabled()) {
      await sendMessage(chatId, `✅ AI Admin уже включён.`);
    } else {
      setEnabled(true);
      await sendMessage(chatId,
        `✅ <b>AI Admin включён!</b>\n\n` +
        `🤖 ИИ снова управляет:\n` +
        `• Модерация товаров\n` +
        `• Разрешение споров\n` +
        `• Безопасность и баны\n` +
        `• Поддержка пользователей\n` +
        `• Все автоматические функции`
      );
      console.log('[Bot] AI Admin включён администратором');
    }
    return;
  }

  // ── /ai_off — выключить ИИ (только админ) ────────────────────────────────
  if (text === '/ai_off') {
    if (!isAdmin(chatId)) {
      await sendMessage(chatId, `⛔ Нет доступа.`);
      return;
    }
    const { setEnabled, isEnabled } = require('./aiAdmin');
    if (!isEnabled()) {
      await sendMessage(chatId, `⏸ AI Admin уже выключен.`);
    } else {
      setEnabled(false);
      await sendMessage(chatId,
        `⏸ <b>AI Admin выключен.</b>\n\n` +
        `ИИ остановлен. Все решения теперь принимаются вручную.\n\n` +
        `Для включения: /ai_on`
      );
      console.log('[Bot] AI Admin выключен администратором');
    }
    return;
  }

  // ── /ai_status — статус ИИ (только админ) ────────────────────────────────
  if (text === '/ai_status') {
    if (!isAdmin(chatId)) {
      await sendMessage(chatId, `⛔ Нет доступа.`);
      return;
    }
    const { isEnabled } = require('./aiAdmin');
    const enabled = isEnabled();
    const status  = enabled ? '🟢 ВКЛЮЧЁН' : '🔴 ВЫКЛЮЧЕН';

    // Собираем статистику
    const { queryOne: qOne } = require('../models/db');
    const [pending, disputes, newProducts] = await Promise.all([
      qOne(`SELECT COUNT(*) as c FROM deals WHERE status='pending'`),
      qOne(`SELECT COUNT(*) as c FROM deals WHERE status='disputed'`),
      qOne(`SELECT COUNT(*) as c FROM products WHERE status='active' AND (ai_moderated IS NULL OR ai_moderated=0)`),
    ]);

    await sendMessage(chatId,
      `🤖 <b>AI Admin — Статус</b>\n\n` +
      `Состояние: <b>${status}</b>\n\n` +
      `📋 <b>Очередь задач:</b>\n` +
      `• Товаров на модерации: <b>${newProducts.c}</b>\n` +
      `• Споров на разрешении: <b>${disputes.c}</b>\n` +
      `• Сделок в ожидании: <b>${pending.c}</b>\n\n` +
      `⚙️ <b>Расписание:</b>\n` +
      `• Модерация — каждые 10 мин\n` +
      `• Споры — каждые 5 мин\n` +
      `• Безопасность — каждые 15 мин\n` +
      `• Цены, продвижение — каждый час\n` +
      `• Реактивация — каждый день\n` +
      `• Прогноз — каждый пн\n\n` +
      `${enabled ? 'Для выключения: /ai_off' : 'Для включения: /ai_on'}`
    );
    return;
  }

  // ── /report — часовой отчёт (только админ) ───────────────────────────────
  if (text === '/report') {
    if (!isAdmin(chatId)) {
      await sendMessage(chatId, `⛔ Нет доступа.`);
      return;
    }
    await sendMessage(chatId, `⏳ <b>Генерирую отчёт...</b>\n\nЭто займёт несколько секунд.`);
    try {
      const { sendHourlyReport } = require('./hourlyReport');
      await sendHourlyReport();
    } catch (e) {
      console.error('[Bot] /report error:', e.message);
      await sendMessage(chatId, `❌ Ошибка: <code>${e.message}</code>`);
    }
    return;
  }

  // ── /code ─────────────────────────────────────────────────────────────────
  if (text.startsWith('/code')) {
    const parts    = text.split(/\s+/);
    const username = (parts[1] || '').toLowerCase();

    if (!username || !/^[a-z0-9_]{3,24}$/.test(username)) {
      await sendMessage(chatId,
        `❗ Укажите логин.\n\nПример: <code>/code myusername</code>\n\nТолько <b>a-z, 0-9, _</b> (3-24 символа).`
      );
      return;
    }

    try {
      const existing = await queryOne(
        `SELECT id, password, telegram_id FROM users WHERE username = $1`, [username]
      );

      if (existing?.password) {
        await sendMessage(chatId, `❌ Логин <b>${username}</b> уже занят. Выберите другой.`);
        return;
      }

      const code    = String(Math.floor(100000 + Math.random() * 900000));
      const expires = Math.floor(Date.now() / 1000) + 10 * 60;
      const tgId    = String(chatId);

      if (existing) {
        await run(`UPDATE users SET otp_code=$1, otp_expires=$2, otp_used=0, telegram_id=$3 WHERE id=$4`,
          [code, expires, tgId, existing.id]);
      } else {
        const tgExists = await queryOne(`SELECT username FROM users WHERE telegram_id=$1`, [tgId]);
        if (tgExists) {
          await sendMessage(chatId,
            `❌ Этот Telegram уже привязан к <b>${tgExists.username}</b>.\n\nДля входа: <code>${tgExists.username}</code>`
          );
          return;
        }
        await run(
          `INSERT INTO users (id, username, telegram_id, otp_code, otp_expires, otp_used) VALUES ($1,$2,$3,$4,$5,0)`,
          [crypto.randomUUID(), username, tgId, code, expires]
        );
      }

      await sendMessage(chatId,
        `🔐 <b>Код подтверждения</b>\n\n` +
        `Логин: <b>${username}</b>\n` +
        `Код: <code>${code}</code>\n\n` +
        `⏱ Действителен <b>10 минут</b>\n` +
        `⚠️ Никому не сообщайте этот код!`
      );
    } catch (e) {
      console.error('[Bot] /code error:', e.message);
      await sendMessage(chatId, `❌ Ошибка. Попробуйте ещё раз.`);
    }
    return;
  }

  // ── /reset ────────────────────────────────────────────────────────────────
  if (text.startsWith('/reset')) {
    const parts    = text.split(/\s+/);
    const username = (parts[1] || '').toLowerCase();

    if (!username) {
      await sendMessage(chatId, `❗ Укажите логин.\n\nПример: <code>/reset myusername</code>`);
      return;
    }

    try {
      const user = await queryOne(
        `SELECT * FROM users WHERE username=$1 AND telegram_id=$2`, [username, String(chatId)]
      );
      if (!user) {
        await sendMessage(chatId,
          `❌ Пользователь <b>${username}</b> не найден или не привязан к этому Telegram.\n\n` +
          `Для регистрации: /code ${username}`
        );
        return;
      }

      const code    = String(Math.floor(100000 + Math.random() * 900000));
      const expires = Math.floor(Date.now() / 1000) + 15 * 60;
      await run(`UPDATE users SET reset_code=$1, reset_expires=$2 WHERE id=$3`, [code, expires, user.id]);

      await sendMessage(chatId,
        `🔑 <b>Код сброса пароля</b>\n\n` +
        `Логин: <b>${username}</b>\n` +
        `Код: <code>${code}</code>\n\n` +
        `⏱ Действителен <b>15 минут</b>`
      );
    } catch (e) {
      console.error('[Bot] /reset error:', e.message);
      await sendMessage(chatId, `❌ Ошибка. Попробуйте ещё раз.`);
    }
    return;
  }

  // ── Любой другой текст — AI отвечает ────────────────────────────────────
  try {
    const { queryOne, queryAll } = require('../models/db');
    const https = require('https');

    // Получаем данные пользователя
    const user = await queryOne(
      'SELECT * FROM users WHERE telegram_id=$1',
      [String(chatId)]
    ).catch(() => null);

    // Строим контекст в зависимости от того кто пишет
    let context = '';

    if (user) {
      // Данные самого пользователя
      const myProducts = await queryAll(
        `SELECT title, price, status FROM products WHERE seller_id=$1 AND status='active' LIMIT 10`,
        [user.id]
      ).catch(() => []);

      const myDeals = await queryAll(
        `SELECT d.status, p.title, d.amount FROM deals d
         LEFT JOIN products p ON p.id=d.product_id
         WHERE (d.buyer_id=$1 OR d.seller_id=$1) AND d.status IN ('active','pending')
         ORDER BY d.created_at DESC LIMIT 5`,
        [user.id]
      ).catch(() => []);

      const productsText = myProducts.length > 0
        ? 'Мои активные товары:\n' + myProducts.map(p => '- ' + p.title + ' ($' + p.price + ')').join('\n')
        : 'Активных товаров нет';
      const dealsText = myDeals.length > 0
        ? 'Мои активные сделки:\n' + myDeals.map(d => '- ' + (d.title||'?') + ' | $' + d.amount + ' | ' + d.status).join('\n')
        : '';
      context = 'Данные пользователя @' + user.username + ':\n' +
        'Баланс: $' + parseFloat(user.balance||0).toFixed(2) + '\n' +
        'Заморожено: $' + parseFloat(user.frozen_balance||0).toFixed(2) + '\n' +
        'Продаж: ' + (user.total_sales||0) + ' | Покупок: ' + (user.total_purchases||0) + '\n' +
        'Рейтинг: ' + (user.rating||5.0) + '\n' +
        productsText + '\n' + dealsText;
    } else {
      context = 'Пользователь не зарегистрирован на платформе.';
    }

    // Если спрашивают о конкретных товарах — ищем в каталоге
    const searchWords = text.toLowerCase();
    let catalogInfo = '';
    if (searchWords.length > 3 && !searchWords.startsWith('/')) {
      const found = await queryAll(
        `SELECT title, price FROM products WHERE status='active'
         AND (LOWER(title) LIKE $1 OR LOWER(description) LIKE $1)
         LIMIT 5`,
        ['%' + searchWords.slice(0,30) + '%']
      ).catch(() => []);
      if (found.length > 0) {
        catalogInfo = '\nТовары в каталоге:\n' + found.map(p => '- ' + p.title + ' за $' + p.price).join('\n');
      } else if (text.length > 5) {
        catalogInfo = '\nТоваров "' + text.slice(0,30) + '" в каталоге нет.';
      }
    }

    // Запрос к Claude
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await sendMessage(chatId, 'AI временно недоступен. Попробуйте позже.');
      return;
    }

    const systemPrompt = `Ты помощник маркетплейса Minions Market — платформы для продажи игровых товаров.
Общайся как живой человек — дружелюбно и естественно по-русски.

ПРАВИЛА:
- Показывай только данные ЭТОГО пользователя (баланс, его товары, его сделки)
- Никогда не раскрывай данные других пользователей
- На вопросы не по теме сайта отвечай: "Я помогаю только по вопросам маркетплейса"
- Отвечай кратко и по делу

О платформе: комиссия 5%, эскроу защита, пополнение через RuKassa/CryptoPay, вывод через CryptoBot.`;

    const userMessage = `${context}${catalogInfo}

Сообщение: ${text}`;

    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const answer = await new Promise((resolve) => {
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
            resolve(json?.content?.[0]?.text || 'Не могу ответить прямо сейчас.');
          } catch(e) {
            resolve('Произошла ошибка. Попробуйте ещё раз.');
          }
        });
        r.on('error', () => resolve('Ошибка соединения. Попробуйте позже.'));
      });
      req.on('error', () => resolve('Ошибка соединения. Попробуйте позже.'));
      req.setTimeout(30000, () => { req.destroy(); resolve('Время ожидания истекло. Попробуйте ещё раз.'); });
      req.write(body);
      req.end();
    });

    await sendMessage(chatId, answer);

    // Уведомляем тебя только если это не ты
    const adminId = process.env.REPORT_CHAT_ID;
    if (adminId && String(chatId) !== String(adminId)) {
      sendMessage(adminId,
        `💬 <b>Вопрос @${user?.username || chatId}</b>
❓ ${text.slice(0,100)}
🤖 ${answer.slice(0,100)}`
      ).catch(() => {});
    }

  } catch (e) {
    console.error('[Bot] chat error:', e.message);
    await sendMessage(chatId, 'Произошла ошибка. Попробуйте ещё раз.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Публичный интерфейс
// ─────────────────────────────────────────────────────────────────────────────

function getBot() {
  setWebhook();
  return { username: process.env.BOT_USERNAME || '' };
}

module.exports = { getBot, handleUpdate, sendMessage, setWebhook };      if (searchWords.length > 3 && !searchWords.startsWith('/')) {
        const found = await queryAll(
          "SELECT title, price FROM products WHERE status='active' AND (LOWER(title) LIKE $1 OR LOWER(description) LIKE $1) LIMIT 5",
          ['%' + searchWords.slice(0,30) + '%']
        ).catch(() => []);
        if (found.length > 0) {
          catalogInfo = '\nТовары в каталоге по запросу "' + text.slice(0,30) + '":\n' +
            found.map(p => '- ' + p.title + ' за $' + p.price).join('\n');
        } else if (text.length > 5) {
          catalogInfo = '\nТоваров по запросу "' + text.slice(0,30) + '" в каталоге не найдено.';
        }
      }
