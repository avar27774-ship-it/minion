const https  = require('https');
const crypto = require('crypto');
const qs     = require('querystring');

const SHOP_ID = () => process.env.RUKASSA_SHOP_ID || '';
const TOKEN   = () => process.env.RUKASSA_TOKEN   || '';
const SECRET  = () => process.env.RUKASSA_SECRET  || '';

// Курс USD → RUB (можно задать через переменную окружения)
const USD_TO_RUB = () => parseFloat(process.env.USD_TO_RUB || '90');

function isConfigured() { return !!(SHOP_ID() && TOKEN()); }

function request(path, params) {
  return new Promise((resolve, reject) => {
    const data = qs.stringify(params);
    const req = https.request({
      hostname: 'lk.rukassa.io',
      path,
      method: 'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(JSON.parse(b)); }
        catch { resolve({ error: 'parse', raw: b }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function createInvoice({ amount, orderId, comment = '', hookUrl = '', successUrl = '' }) {
  if (!isConfigured()) return { ok: false, error: 'RuKassa не настроен' };

  // Конвертируем USD → RUB
  const amountRub = Math.ceil(parseFloat(amount) * USD_TO_RUB());

  // order_id — числовой уникальный
  const numericOrderId = Date.now();

  // user_code — уникальный per-заказ (не фиксированный user ID)
  // Используем случайный чтобы антифрод не блокировал повторные запросы
  const userCode = crypto.randomBytes(8).toString('hex');

  const params = {
    shop_id:          parseInt(SHOP_ID()),
    token:            TOKEN(),
    order_id:         numericOrderId,
    amount:           amountRub,
    currency:         'RUB',
    user_code:        userCode,           // случайный per-заказ
    data:             String(orderId),    // наш внутренний orderId для вебхука
    notification_url: hookUrl,
    success_url:      successUrl,
    fail_url:         successUrl,
  };

  console.log('[RuKassa] createInvoice:', JSON.stringify({ ...params, token: '***' }));

  try {
    const res = await request('/api/v1/create', params);
    console.log('[RuKassa] response:', JSON.stringify(res));

    if (res && res.url)  return { ok: true, payUrl: res.url,  invoiceId: String(res.id || numericOrderId) };
    if (res && res.link) return { ok: true, payUrl: res.link, invoiceId: String(res.id || numericOrderId) };
    return { ok: false, error: res?.message || res?.error || JSON.stringify(res) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function verifyWebhook(body) {
  if (!SECRET()) return true;
  try {
    const { shop_id, amount, order_id, sign: s } = body;
    if (!shop_id || !amount || !order_id || !s) return false;
    const expected = crypto.createHash('md5')
      .update(`${shop_id}:${amount}:${order_id}:${SECRET()}`)
      .digest('hex');
    return expected === s.toLowerCase();
  } catch { return false; }
}

module.exports = { isConfigured, createInvoice, verifyWebhook };
