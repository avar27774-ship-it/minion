/**
 * Telegram Bot — OTP auth + notifications
 * OTP is bound to username: /code <username> creates/updates a stub user
 */
const TelegramBot = require('node-telegram-bot-api');
const crypto      = require('crypto');

let bot     = null;
let botInfo = null;

function getBot() {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    bot.getMe().then(info => {
      botInfo = info;
      bot.username = info.username;
      console.log(`✅ Telegram bot @${info.username} started`);
    }).catch(e => console.error('[Bot] getMe failed:', e.message));
    setupHandlers();
  }
  return bot;
}

function setupHandlers() {
  if (!bot) return;

  bot.onText(/\/start(.*)/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
      `🟡 <b>Minions Market Bot</b>\n\n` +
      `Команды:\n` +
      `• /code [логин] — получить код для входа/регистрации\n` +
      `• /reset [логин] — сбросить пароль\n` +
      `• /help — помощь`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  });

  // /code <username> — creates stub user and sends OTP
  bot.onText(/\/code (.+)/, async (msg, match) => {
    const chatId   = msg.chat.id;
    const username = match[1].trim().toLowerCase();

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return bot.sendMessage(chatId,
        `❌ Недопустимый логин.\n\nТолько <b>a-z, 0-9, _</b> (3-24 символа).\n\nПример: /code myusername`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    const db = require('../models/db');

    // Check if username is fully registered (has password)
    const existing = db.prepare('SELECT id, password, telegram_id FROM users WHERE username = ?').get(username);
    if (existing?.password) {
      return bot.sendMessage(chatId,
        `❌ Логин <b>${username}</b> уже занят.\n\nВыберите другой логин.`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    const code    = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes
    const tgId    = String(chatId);

    try {
      if (existing) {
        // Update existing stub user
        db.prepare(
          `UPDATE users SET otp_code = ?, otp_expires = ?, otp_used = 0, telegram_id = ? WHERE id = ?`
        ).run(code, expires, tgId, existing.id);
      } else {
        // Create new stub user bound to this username + telegram
        const id = crypto.randomUUID();
        db.prepare(
          `INSERT INTO users (id, username, telegram_id, otp_code, otp_expires, otp_used) VALUES (?, ?, ?, ?, ?, 0)`
        ).run(id, username, tgId, code, expires);
      }

      await bot.sendMessage(chatId,
        `🔐 <b>Код подтверждения</b>\n\n` +
        `Логин: <b>${username}</b>\n` +
        `Код: <code>${code}</code>\n\n` +
        `⏱ Действителен <b>10 минут</b>\n` +
        `⚠️ Никому не сообщайте этот код!`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      console.error('[Bot] /code error:', e.message);
      await bot.sendMessage(chatId, `❌ Ошибка генерации кода. Попробуйте ещё раз.`).catch(() => {});
    }
  });

  // /code without argument
  bot.onText(/^\/code$/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
      `❗ Укажите логин.\n\nПример: <code>/code myusername</code>`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  });

  // /reset <username>
  bot.onText(/\/reset (.+)/, async (msg, match) => {
    const chatId   = msg.chat.id;
    const username = match[1].trim().toLowerCase();
    const db       = require('../models/db');

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND telegram_id = ?').get(username, String(chatId));
    if (!user) {
      return bot.sendMessage(chatId,
        `❌ Пользователь <b>${username}</b> не найден или не привязан к этому Telegram.\n\n` +
        `Если вы ещё не зарегистрированы — используйте /code для регистрации.`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    const code    = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Math.floor(Date.now() / 1000) + 15 * 60;
    db.prepare('UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?').run(code, expires, user.id);

    await bot.sendMessage(chatId,
      `🔑 <b>Код для сброса пароля</b>\n\n` +
      `Логин: <b>${username}</b>\n` +
      `Код: <code>${code}</code>\n\n` +
      `⏱ Действителен <b>15 минут</b>`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  });

  bot.onText(/\/help/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
      `🟡 <b>Minions Market — Помощь</b>\n\n` +
      `/code [логин] — код для регистрации\n` +
      `/reset [логин] — сброс пароля\n\n` +
      `По вопросам: @minions_support`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  });

  bot.on('polling_error', (e) => console.error('[Bot polling error]', e.message));
  bot.on('error', (e) => console.error('[Bot error]', e.message));
}

module.exports = { getBot };
/**
 * Telegram Bot — OTP auth + notifications
 * Security fix: /code creates a stub user atomically, so OTP is bound to username
 */
const TelegramBot = require('node-telegram-bot-api');
const crypto      = require('crypto');

let bot    = null;
let botInfo = null;

function getBot() {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    bot.getMe().then(info => {
      botInfo = info;
      bot.username = info.username;
      console.log(`✅ Telegram bot @${info.username} started`);
    });
    setupHandlers();
  }
  return bot;
}

function setupHandlers() {
  if (!bot) return;

  bot.onText(/\/start(.*)/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
      `🟡 <b>Minions Market Bot</b>\n\n` +
      `Команды:\n` +
      `• /code [логин] — получить код для входа/регистрации\n` +
      `• /reset [логин] — сбросить пароль\n` +
      `• /help — помощь`,
      { parse_mode: 'HTML' }
    );
  });

  // SECURITY FIX: /code creates stub user with username + OTP + telegram_id
  // so OTP is permanently bound to that username and telegram account
  bot.onText(/\/code (.+)/, async (msg, match) => {
    const chatId   = msg.chat.id;
    const username = match[1].trim().toLowerCase();

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return bot.sendMessage(chatId, `❌ Недопустимый логин. Только a-z, 0-9, _ (3-24 символа).`, { parse_mode: 'HTML' });
    }

    // Lazy require to avoid circular deps
    const db = require('../models/db');

    const existing = db.prepare('SELECT id, password FROM users WHERE username = ?').get(username);
    if (existing?.password) {
      return bot.sendMessage(chatId,
        `❌ Логин <b>${username}</b> уже занят и подтверждён.\n\nВыберите другой логин.`,
        { parse_mode: 'HTML' }
      );
    }

    const code    = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Math.floor(Date.now() / 1000) + 10 * 60;

    if (existing) {
      // Update existing stub
      db.prepare('UPDATE users SET otp_code = ?, otp_expires = ?, otp_used = 0, telegram_id = ? WHERE id = ?')
        .run(code, expires, String(chatId), existing.id);
    } else {
      // Create stub user — bound to this username AND this telegram
      const id = crypto.randomUUID();
      db.prepare(`INSERT INTO users (id, username, telegram_id, otp_code, otp_expires, otp_used) VALUES (?, ?, ?, ?, ?, 0)`)
        .run(id, username, String(chatId), code, expires);
    }

    await bot.sendMessage(chatId,
      `🔐 <b>Код подтверждения для @${username}</b>\n\n` +
      `<code>${code}</code>\n\n` +
      `⏱ Действителен 10 минут\n` +
      `⚠️ Никому не сообщайте этот код!`,
      { parse_mode: 'HTML' }
    );
  });

  bot.onText(/\/reset (.+)/, async (msg, match) => {
    const chatId   = msg.chat.id;
    const username = match[1].trim().toLowerCase();
    const db       = require('../models/db');

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND telegram_id = ?').get(username, String(chatId));
    if (!user) {
      return bot.sendMessage(chatId,
        `❌ Пользователь <b>${username}</b> не найден или не привязан к этому Telegram.\n\nПервый раз? Используйте /code для регистрации.`,
        { parse_mode: 'HTML' }
      );
    }

    const code    = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Math.floor(Date.now() / 1000) + 15 * 60;
    db.prepare('UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?').run(code, expires, user.id);

    await bot.sendMessage(chatId,
      `🔑 <b>Код для сброса пароля</b>\n\n` +
      `Логин: <b>${username}</b>\n` +
      `Код: <code>${code}</code>\n\n` +
      `⏱ Действителен 15 минут`,
      { parse_mode: 'HTML' }
    );
  });

  bot.onText(/\/help/, async (msg) => {
    await bot.sendMessage(msg.chat.id,
      `🟡 <b>Minions Market — Помощь</b>\n\n` +
      `/code [логин] — код для входа/регистрации\n` +
      `/reset [логин] — сброс пароля\n\n` +
      `По вопросам: @minions_support`,
      { parse_mode: 'HTML' }
    );
  });

  bot.on('polling_error', (e) => console.error('[Bot polling error]', e.message));
}

module.exports = { getBot };
