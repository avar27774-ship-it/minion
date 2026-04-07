'use strict';
/**
 * Скрипт: Требовать верификацию телефона у всех пользователей
 * 
 * Запуск: node backend/scripts/require-phone-verification.js
 * 
 * Что делает:
 * 1. Находит всех пользователей без phone_verified
 * 2. Ставит им бан с причиной 'phone_required'
 * 3. Отправляет уведомление в Telegram (если есть telegram_id)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.BACKEND_URL || '';
const REPORT_CHAT_ID = process.env.REPORT_CHAT_ID || '';

function sendTg(chatId, text, opts = {}) {
  if (!TOKEN || !chatId) return Promise.resolve();
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: String(chatId), text, parse_mode: 'HTML', ...opts });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (r) => { r.resume(); resolve(); });
    req.on('error', () => resolve());
    req.setTimeout(10000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔍 Ищем пользователей без верификации телефона...');

    // Найти всех без phone_verified (кроме администраторов)
    const result = await client.query(`
      SELECT id, username, telegram_id, is_admin, is_sub_admin, phone_verified, is_banned, ban_reason
      FROM users
      WHERE phone_verified = 0 OR phone_verified IS NULL
    `);

    const users = result.rows;
    console.log(`📊 Найдено ${users.length} пользователей без верификации телефона`);

    let banned = 0;
    let skipped = 0;
    let notified = 0;

    for (const user of users) {
      // Пропустить администраторов
      if (user.is_admin || user.is_sub_admin) {
        console.log(`⏭ Пропускаем админа: ${user.username}`);
        skipped++;
        continue;
      }

      // Уже забанен по другой причине — не перебиваем
      if (user.is_banned && user.ban_reason && user.ban_reason !== 'phone_required') {
        console.log(`⏭ Уже забанен по другой причине: ${user.username} (${user.ban_reason})`);
        skipped++;
        continue;
      }

      // Ставим бан с причиной phone_required
      await client.query(
        `UPDATE users SET is_banned = 1, ban_reason = 'phone_required', banned_until = NULL WHERE id = $1`,
        [user.id]
      );
      banned++;
      console.log(`🔒 Заблокирован: ${user.username || user.id}`);

      // Отправить уведомление в Telegram если есть tg_id
      if (user.telegram_id) {
        try {
          await sendTg(user.telegram_id,
            '🔒 <b>Ваш аккаунт временно ограничен</b>\n\n' +
            'Для продолжения использования маркетплейса необходимо подтвердить номер телефона.\n\n' +
            '📱 Это обязательная мера защиты от мошенников и мультиаккаунтов.\n\n' +
            '<b>Что нужно сделать:</b>\n' +
            '1. Нажмите /start\n' +
            '2. Нажмите кнопку «📱 Поделиться номером»\n' +
            '3. Разрешите отправку контакта\n\n' +
            '✅ После этого аккаунт будет моментально разблокирован.',
            {
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [{ text: '▶️ Начать верификацию', url: `https://t.me/${process.env.BOT_USERNAME || ''}?start=verify` }]
                ]
              })
            }
          );
          notified++;
          // Пауза чтобы не попасть под rate limit Telegram (30 msg/sec)
          await sleep(50);
        } catch (e) {
          console.log(`  ⚠️ Не удалось уведомить ${user.username}: ${e.message}`);
        }
      }
    }

    console.log('\n✅ Готово!');
    console.log(`🔒 Заблокировано: ${banned}`);
    console.log(`📱 Уведомлено: ${notified}`);
    console.log(`⏭ Пропущено: ${skipped}`);

    // Уведомить администратора
    if (REPORT_CHAT_ID) {
      await sendTg(REPORT_CHAT_ID,
        '📱 <b>Верификация телефонов запущена</b>\n\n' +
        `🔒 Заблокировано: ${banned}\n` +
        `📨 Уведомлено: ${notified}\n` +
        `⏭ Пропущено (админы/уже банены): ${skipped}\n\n` +
        'Пользователи разблокируются автоматически после отправки номера боту.'
      );
    }

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => {
  console.error('❌ Ошибка:', e);
  process.exit(1);
});
