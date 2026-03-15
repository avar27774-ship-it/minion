'use strict';
const https = require('https');
const crypto = require('crypto');

const API_KEY    = () => process.env.NOWPAYMENTS_API_KEY    || '';
const IPN_SECRET = () => process.env.NOWPAYMENTS_IPN_SECRET || '';

function isConfigured() { return !!API_KEY(); }

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.nowpayments.io',
      path:     '/v1' + path,
      method,
      headers: {
        'x-api-key':    API_KEY(),
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (r) => {
      let buf = '';
      r.on('data', c => buf += c);
      r.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch { resolve({ error: 'parse' }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

// Создать платёж
async function createPayment({ amount, orderId, currency = 'usdttrc20', description = '' }) {
  if (!isConfigured()) return { ok: false, error: 'NOWPayments не настроен' };
  try {
    const res = await request('POST', '/payment', {
      price_amount:    parseFloat(amount),
      price_currency:  'usd',
      pay_currency:    currency,
      order_id:        String(orderId),
      order_description: description || `Пополнение Minions Market $${amount}`,
      ipn_callback_url: process.env.BACKEND_URL + '/api/wallet/webhook/nowpayments',
      success_url:      (process.env.FRONTEND_URL || process.env.BACKEND_URL) + '/wallet?success=1',
      cancel_url:       (process.env.FRONTEND_URL || process.env.BACKEND_URL) + '/wallet',
    });
    console.log('[NOWPayments] createPayment response:', JSON.stringify(res));
    if (res.payment_id) {
      return {
        ok:        true,
        payUrl:    res.invoice_url || `https://nowpayments.io/payment/?iid=${res.payment_id}`,
        invoiceId: String(res.payment_id),
        payAddress: res.pay_address,
        payAmount:  res.pay_amount,
        payCurrency: res.pay_currency,
      };
    }
    return { ok: false, error: res.message || JSON.stringify(res) };
  } catch(e) { return { ok: false, error: e.message }; }
}

// Создать инвойс (лучше для редиректа)
async function createInvoice({ amount, orderId, description = '' }) {
  if (!isConfigured()) return { ok: false, error: 'NOWPayments не настроен' };
  try {
    const res = await request('POST', '/invoice', {
      price_amount:    parseFloat(amount),
      price_currency:  'usd',
      order_id:        String(orderId),
      order_description: description || `Пополнение Minions Market $${amount}`,
      ipn_callback_url: process.env.BACKEND_URL + '/api/wallet/webhook/nowpayments',
      success_url:      (process.env.FRONTEND_URL || process.env.BACKEND_URL) + '/wallet?success=1',
      cancel_url:       (process.env.FRONTEND_URL || process.env.BACKEND_URL) + '/wallet',
    });
    console.log('[NOWPayments] createInvoice response:', JSON.stringify(res));
    if (res.id && res.invoice_url) {
      return { ok: true, payUrl: res.invoice_url, invoiceId: String(res.id) };
    }
    return { ok: false, error: res.message || JSON.stringify(res) };
  } catch(e) { return { ok: false, error: e.message }; }
}

// Проверка подписи вебхука
function verifyWebhook(body, signature) {
  if (!IPN_SECRET()) return true;
  try {
    const sorted = Object.keys(body).sort().reduce((acc, key) => {
      acc[key] = body[key]; return acc;
    }, {});
    const expected = crypto.createHmac('sha512', IPN_SECRET())
      .update(JSON.stringify(sorted))
      .digest('hex');
    return expected === signature;
  } catch { return false; }
}

module.exports = { isConfigured, createInvoice, createPayment, verifyWebhook };
