const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const { queryOne, queryAll, run } = require('../models/db');
const { generateToken, auth } = require('../middleware/auth');
const { getBot } = require('../utils/bot');
const notify  = require('../utils/notify');
const { log, getIp, EVENTS } = require('../utils/securityLog');

function sanitizeUser(u) {
  if (!u) return null;
  const safe = { ...u };
  delete safe.password; delete safe.otp_code; delete safe.otp_expires;
  delete safe.otp_used; delete safe.reset_code; delete safe.reset_expires;
  safe._id = safe.id;
  safe.balance        = parseFloat(safe.balance) || 0;
  safe.frozenBalance  = parseFloat(safe.frozen_balance) || 0;
  safe.totalSales     = safe.total_sales || 0;
  safe.totalPurchases = safe.total_purchases || 0;
  safe.isAdmin        = !!safe.is_admin;
  safe.isSubAdmin     = !!safe.is_sub_admin;
  safe.isBanned       = !!safe.is_banned;
  safe.isVerified     = !!safe.is_verified;
  safe.photoUrl       = safe.photo_url;
  safe.firstName      = safe.first_name;
  safe.lastName       = safe.last_name;
  safe.reviewCount    = safe.review_count || 0;
  safe.totalDeposited = parseFloat(safe.total_deposited) || 0;
  safe.totalWithdrawn = parseFloat(safe.total_withdrawn) || 0;
  return safe;
}

function validateUsername(u) {
  return /^[a-z0-9_]{3,24}$/.test(u);
}

// ── POST /auth/register/init ──────────────────────────────────────────────────
router.post('/register/init', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || !validateUsername(username)) {
      return res.status(400).json({ error: 'Недопустимый логин (3-24 символа, только a-z 0-9 _)' });
    }
    const existing = await queryOne('SELECT id, password FROM users WHERE username = $1', [username.toLowerCase()]);
    if (existing?.password) return res.status(409).json({ error: 'Логин уже занят' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /auth/register/check ─────────────────────────────────────────────────
router.post('/register/check', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || !validateUsername(username)) {
      return res.status(400).json({ error: 'Недопустимый логин' });
    }
    const existing = await queryOne('SELECT id, password FROM users WHERE username = $1', [username.toLowerCase()]);
    if (existing?.password) return res.status(409).json({ error: 'Логин уже занят' });

    const bot = getBot();
    const botUsername = bot?.username || process.env.BOT_USERNAME || 'my_cheats_bot';
    res.json({ botUsername });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /auth/register/verify ────────────────────────────────────────────────
router.post('/register/verify', async (req, res) => {
  try {
    const { username, code, password } = req.body;
    if (!username || !code || !password) return res.status(400).json({ error: 'Заполните все поля' });
    if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    if (!validateUsername(username)) return res.status(400).json({ error: 'Недопустимый логин' });

    const uname = username.toLowerCase();
    const trimmedCode = code.trim();
    const now = Math.floor(Date.now() / 1000);
    const ip  = getIp(req);

    const alreadyDone = await queryOne('SELECT id, password FROM users WHERE username = $1', [uname]);
    if (alreadyDone?.password) return res.status(409).json({ error: 'Логин уже занят' });

    let stubUser = await queryOne(
      `SELECT * FROM users WHERE username = $1 AND otp_code = $2 AND otp_used = 0 AND otp_expires > $3`,
      [uname, trimmedCode, now]
    );

    if (!stubUser) {
      const byCode = await queryAll(
        `SELECT * FROM users WHERE otp_code = $1 AND otp_used = 0 AND otp_expires > $2 AND password IS NULL`,
        [trimmedCode, now]
      );
      stubUser = byCode.find(u => u.username === uname) || null;
    }

    if (!stubUser) {
      await log(EVENTS.LOGIN_FAIL, req, { username: uname, details: { reason: 'invalid_otp' } });
      return res.status(400).json({
        error: `Неверный или просроченный код. Запросите новый командой /code ${uname} в боте.`
      });
    }

    const hash = await bcrypt.hash(password, 12);
    await run(
      `UPDATE users SET password = $1, otp_used = 1, otp_code = NULL, otp_expires = NULL, is_verified = 1, register_ip = $2, last_ip = $3 WHERE id = $4`,
      [hash, ip, ip, stubUser.id]
    );

    const user = await queryOne('SELECT * FROM users WHERE id = $1', [stubUser.id]);
    const token = generateToken(user.id);

    await log(EVENTS.REGISTER, req, { userId: user.id, username: uname });
    if (user.telegram_id) notify.notifyRegistered(user).catch(() => {});

    res.json({ token, user: sanitizeUser(user) });
  } catch (e) {
    console.error('Register verify error:', e);
    res.status(500).json({ error: 'Внутренняя ошибка' });
  }
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Заполните все поля' });

    const user = await queryOne('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);

    if (!user || !user.password) {
      await log(EVENTS.LOGIN_FAIL, req, { username, details: { reason: 'user_not_found' } });
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      await log(EVENTS.LOGIN_FAIL, req, { userId: user.id, username: user.username, details: { reason: 'wrong_password' } });
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    if (user.is_banned) {
      await log(EVENTS.BANNED_ACCESS, req, { userId: user.id, username: user.username });
      const until = user.banned_until ? ` до ${new Date(user.banned_until * 1000).toLocaleDateString('ru')}` : ' навсегда';
      return res.status(403).json({ error: `Аккаунт заблокирован${until}. ${user.ban_reason || ''}` });
    }

    const now       = Math.floor(Date.now() / 1000);
    const currentIp = getIp(req);
    const isNewIp   = user.last_ip && user.last_ip !== currentIp;

    await run('UPDATE users SET last_active = $1, last_ip = $2 WHERE id = $3', [now, currentIp, user.id]);
    await log(EVENTS.LOGIN_OK, req, { userId: user.id, username: user.username });

    // Уведомление о входе с нового IP
    if (isNewIp) {
      const notify = require('../utils/notify');

      // Сначала тебе
      if (process.env.REPORT_CHAT_ID) {
        notify.sendTg(process.env.REPORT_CHAT_ID,
          `🔔 <b>Вход с нового IP</b>\n\n` +
          `👤 @${user.username}\n` +
          `📍 Старый IP: <code>${user.last_ip}</code>\n` +
          `📍 Новый IP: <code>${currentIp}</code>\n` +
          `🕐 ${new Date().toLocaleString('ru')}`
        ).catch(() => {});
      }

      // Потом пользователю
      if (user.telegram_id) {
        notify.sendTg(user.telegram_id,
          `🔔 <b>Вход в аккаунт с нового устройства</b>\n\n` +
          `IP: <code>${currentIp}</code>\n` +
          `Время: ${new Date().toLocaleString('ru')}\n\n` +
          `Если это не вы — немедленно смените пароль!`
        ).catch(() => {});
      }
    }

    const token = generateToken(user.id);

    // Применяем реф код если передан
    if (req.body.ref_code) {
      const partner = await queryOne('SELECT id, ref_code FROM users WHERE ref_code=$1 AND is_partner=1', [req.body.ref_code]).catch(() => null);
      if (partner && partner.id !== user.id) {
        await run('UPDATE users SET ref_by=$1 WHERE id=$2 AND ref_by IS NULL', [req.body.ref_code, user.id]).catch(() => {});
      }
    }

    res.json({ token, user: sanitizeUser(user) });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Внутренняя ошибка' });
  }
});

// ── POST /auth/reset/request ──────────────────────────────────────────────────
router.post('/reset/request', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Введите логин' });

    const user = await queryOne('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    const botUsername = getBot()?.username || process.env.BOT_USERNAME || 'my_cheats_bot';

    if (user && user.telegram_id) {
      const code    = String(Math.floor(100000 + Math.random() * 900000));
      const expires = Math.floor(Date.now() / 1000) + 15 * 60;
      await run('UPDATE users SET reset_code = $1, reset_expires = $2 WHERE id = $3', [code, expires, user.id]);
      notify.sendCode(user.telegram_id, code, 'reset').catch(() => {});
      await log(EVENTS.RESET_CODE, req, { userId: user.id, username: user.username });
    }

    res.json({ ok: true, botUsername });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /auth/reset/confirm ──────────────────────────────────────────────────
router.post('/reset/confirm', async (req, res) => {
  try {
    const { username, code, newPassword } = req.body;
    if (!username || !code || !newPassword) return res.status(400).json({ error: 'Заполните все поля' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

    const user = await queryOne(
      `SELECT * FROM users WHERE username = $1 AND reset_code = $2 AND reset_expires > $3`,
      [username.toLowerCase(), code.trim(), Math.floor(Date.now() / 1000)]
    );
    if (!user) return res.status(400).json({ error: 'Неверный или просроченный код' });

    const hash = await bcrypt.hash(newPassword, 12);
    await run('UPDATE users SET password = $1, reset_code = NULL, reset_expires = NULL WHERE id = $2', [hash, user.id]);
    await log(EVENTS.RESET_OK, req, { userId: user.id, username: user.username });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Внутренняя ошибка' });
  }
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.userId]);
    // Обновляем last_ip при каждом /me
    await run('UPDATE users SET last_ip = $1 WHERE id = $2', [getIp(req), req.userId]).catch(() => {});
    res.json(sanitizeUser(user));
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /auth/tg-webapp ── авторизация через Telegram Mini App ───────────────
router.post('/tg-webapp', async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'initData required' });

    // Верифицируем подпись Telegram
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return res.status(500).json({ error: 'Bot not configured' });

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    // Сортируем параметры и создаём строку для проверки
    const checkString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    if (expectedHash !== hash) {
      return res.status(401).json({ error: 'Invalid Telegram signature' });
    }

    // Проверяем свежесть данных (не старше 1 часа)
    const authDate = parseInt(params.get('auth_date') || '0');
    if (Date.now() / 1000 - authDate > 3600) {
      return res.status(401).json({ error: 'initData expired' });
    }

    // Парсим данные пользователя
    let tgUser;
    try { tgUser = JSON.parse(params.get('user') || '{}'); } catch { tgUser = {}; }

    const tgId = String(tgUser.id || '');
    if (!tgId) return res.status(400).json({ error: 'No user in initData' });

    // Ищем существующего пользователя по telegram_id
    let user = await queryOne('SELECT * FROM users WHERE telegram_id = $1', [tgId]);

    if (!user) {
      // Авто-регистрация: генерируем username из имени Telegram
      const firstName = (tgUser.first_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const baseUsername = (firstName || 'user') + '_' + tgId.slice(-4);
      let username = baseUsername.slice(0, 24);

      // Проверяем уникальность
      const exists = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
      if (exists) username = 'tg' + tgId.slice(-8);

      const userId = require('crypto').randomUUID();
      await run(
        `INSERT INTO users (id, username, telegram_id, first_name, last_name, photo_url, created_at, last_active)
         VALUES ($1,$2,$3,$4,$5,$6,EXTRACT(EPOCH FROM NOW())::BIGINT,EXTRACT(EPOCH FROM NOW())::BIGINT)`,
        [userId, username, tgId,
         tgUser.first_name || null,
         tgUser.last_name  || null,
         tgUser.photo_url  || null]
      );
      user = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);
      notify.notifyRegistered(user).catch(() => {});
    } else {
      // Обновляем last_active и данные профиля
      await run(
        `UPDATE users SET last_active = EXTRACT(EPOCH FROM NOW())::BIGINT,
         first_name = COALESCE($1, first_name),
         last_name  = COALESCE($2, last_name)
         WHERE id = $3`,
        [tgUser.first_name || null, tgUser.last_name || null, user.id]
      );
    }

    if (user.is_banned) {
      const exp = user.banned_until ? new Date(user.banned_until * 1000).toLocaleString('ru') : 'навсегда';
      return res.status(403).json({ error: `Аккаунт заблокирован до ${exp}` });
    }

    const jwtToken = generateToken(user.id);
    res.json({ token: jwtToken, user: sanitizeUser(user), isNew: !user.password });
  } catch (e) {
    console.error('[TgWebApp] auth error:', e.message);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});


module.exports = router;
module.exports.sanitizeUser = sanitizeUser;
