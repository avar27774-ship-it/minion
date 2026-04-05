'use strict';
const https  = require('https');
const crypto = require('crypto');

// CrystalPAY — https://crystalpay.io
// Документация: https://docs.crystalpay.io
//
// Переменные окружения (.env):
//   CRYSTALPAY_LOGIN   — логин кассы (название из бота)
//   CRYSTALPAY_SECRET  — секретный ключ кассы (auth_secret)
//   CRYSTALPAY_SALT    — соль для верификации вебхуков

const LOGIN  = () => process.env.CRYSTALPAY_LOGIN  || '';
const SECRET = () => process.env.CRYSTALPAY_SECRET || '';
const SALT   = () => process.env.CRYSTALPAY_SALT   || '';

// Курс USD → RUB (используется для конвертации суммы)
const USD_TO_RUB = () => parseFloat(process.env.USD_TO_RUB || '90');

function isConfigured() {
  return !!(LOGIN() && SECRET());
}

// ── HTTP запрос к API ─────────────────────────────────────────────────────────
function request(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = https.request({
      hostname: 'api.crystalpay.io',
      path,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch { resolve({ error: true, errors: ['parse error'], raw: buf }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

// ── Генерация подписи (sha1 от "{id}:{salt}") ─────────────────────────────────
function makeSignature(id) {
  return crypto.createHash('sha1')
    .update(`${id}:${SALT()}`)
    .digest('hex');
}

// ── Создать инвойс на пополнение ──────────────────────────────────────────────
// amount     — сумма в USD
// orderId    — внутренний ID заказа (сохраняется в поле extra)
// hookUrl    — URL для callback уведомлений
// successUrl — URL для редиректа после оплаты
async function createInvoice({ amount, orderId, hookUrl = '', successUrl = '' }) {
  if (!isConfigured()) return { ok: false, error: 'CrystalPAY не настроен' };

  // Конвертируем USD → RUB (CrystalPAY принимает рубли по умолчанию)
  const amountRub = Math.ceil(parseFloat(amount) * USD_TO_RUB());

  const body = {
    auth_login:   LOGIN(),
    auth_secret:  SECRET(),
    amount:       amountRub,
    type:         'topup',       // topup = пополнение баланса (любая сумма)
    lifetime:     60,            // 60 минут на оплату
    currency:     'RUB',
    subtract_from: 'balance',   // комиссия вычитается из зачисления, а не добавляется к сумме
    description:  `Пополнение Minions Market $${amount}`,
    extra:        String(orderId),
    callback_url: hookUrl,
    redirect_url: successUrl,
  };

  console.log('[CrystalPAY] createInvoice:', JSON.stringify({ ...body, auth_secret: '***' }));

  try {
    const res = await request('/v3/invoice/create/', body);
    console.log('[CrystalPAY] response:', JSON.stringify(res));

    if (res && !res.error && res.id && res.url) {
      return {
        ok:        true,
        payUrl:    res.url,
        invoiceId: String(res.id),
        rubAmount: res.rub_amount,
      };
    }
    return { ok: false, error: (res.errors || []).join(', ') || JSON.stringify(res) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Получить информацию об инвойсе ────────────────────────────────────────────
async function getInvoice(invoiceId) {
  if (!isConfigured()) return { ok: false, error: 'CrystalPAY не настроен' };

  try {
    const res = await request('/v3/invoice/info/', {
      auth_login:  LOGIN(),
      auth_secret: SECRET(),
      id:          String(invoiceId),
    });

    if (res && !res.error) {
      return {
        ok:     true,
        state:  res.state,   // 'payed' | 'notpayed' | 'expired' | 'failed' | ...
        amount: res.amount,
        extra:  res.extra,   // наш orderId
      };
    }
    return { ok: false, error: (res.errors || []).join(', ') || JSON.stringify(res) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Верификация вебхука ───────────────────────────────────────────────────────
// CrystalPAY отправляет в теле: { signature, id, state, ... }
// Подпись: sha1("{id}:{salt}")
function verifyWebhook(body) {
  if (!SALT()) return true; // если соль не задана — пропускаем проверку
  try {
    const { signature, id } = body;
    if (!signature || !id) return false;
    const expected = makeSignature(id);
    return expected === signature;
  } catch { return false; }
}

module.exports = {
  isConfigured,
  createInvoice,
  getInvoice,
  verifyWebhook,
  USD_TO_RUB,
};
