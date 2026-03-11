const router   = require('express').Router();
const crypto   = require('crypto');
const db       = require('../models/db');
const { auth } = require('../middleware/auth');
const rukassa  = require('../utils/rukassa');
const cryptocloud = require('../utils/cryptocloud');
const notify   = require('../utils/notify');
const { sanitizeUser } = require('./auth');

const MIN_DEPOSIT = 1;

// ── GET /wallet/transactions ──────────────────────────────────────────────────
router.get('/transactions', auth, (req, res) => {
  try {
    const txs = db.prepare(`
      SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(req.userId);
    res.json({ transactions: txs.map(tx => ({ ...tx, _id: tx.id, createdAt: new Date(tx.created_at * 1000) })) });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /wallet/deposit/rukassa ──────────────────────────────────────────────
router.post('/deposit/rukassa', auth, async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    if (!amount || amount < MIN_DEPOSIT) return res.status(400).json({ error: `Минимум $${MIN_DEPOSIT}` });

    const orderId = `rukassa_${req.userId}_${Date.now()}`;
    const hookUrl = `${process.env.BACKEND_URL || ''}/api/wallet/webhook/rukassa`;
    const successUrl = `${process.env.FRONTEND_URL || ''}/wallet?success=1`;

    const result = await rukassa.createInvoice({ amount, orderId, hookUrl, successUrl });
    if (!result.ok) return res.status(502).json({ error: result.error });

    // Save pending transaction
    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, status, description, gateway_type, gateway_invoice_id, gateway_pay_url, gateway_order_id, balance_before)
      VALUES (?, ?, 'deposit', ?, 'pending', 'Пополнение RuKassa', 'rukassa', ?, ?, ?, ?)
    `).run(crypto.randomUUID(), req.userId, amount, result.invoiceId, result.payUrl, orderId,
           db.prepare('SELECT balance FROM users WHERE id = ?').get(req.userId)?.balance || 0);

    res.json({ payUrl: result.payUrl, orderId });
  } catch (e) {
    console.error('Rukassa deposit error:', e);
    res.status(500).json({ error: 'Ошибка платёжной системы' });
  }
});

// ── POST /wallet/deposit/cryptocloud ─────────────────────────────────────────
router.post('/deposit/cryptocloud', auth, async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    if (!amount || amount < MIN_DEPOSIT) return res.status(400).json({ error: `Минимум $${MIN_DEPOSIT}` });

    const orderId = `cc_${req.userId}_${Date.now()}`;
    const result  = await cryptocloud.createInvoice({ amount, orderId });
    if (!result.ok) return res.status(502).json({ error: result.error });

    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, status, description, gateway_type, gateway_invoice_id, gateway_pay_url, gateway_order_id, balance_before)
      VALUES (?, ?, 'deposit', ?, 'pending', 'Пополнение CryptoCloud', 'cryptocloud', ?, ?, ?, ?)
    `).run(crypto.randomUUID(), req.userId, amount, result.invoiceId, result.payUrl, orderId,
           db.prepare('SELECT balance FROM users WHERE id = ?').get(req.userId)?.balance || 0);

    res.json({ payUrl: result.payUrl, orderId });
  } catch (e) {
    console.error('CryptoCloud deposit error:', e);
    res.status(500).json({ error: 'Ошибка платёжной системы' });
  }
});

// ── POST /wallet/webhook/rukassa ──────────────────────────────────────────────
router.post('/webhook/rukassa', (req, res) => {
  try {
    if (!rukassa.verifyWebhook(req.body)) {
      console.warn('Invalid RuKassa webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const { order_id, status } = req.body;
    if (status !== 'success') return res.send('ok');

    const tx = db.prepare('SELECT * FROM transactions WHERE gateway_order_id = ?').get(order_id);
    if (!tx || tx.status === 'completed') return res.send('ok');

    creditUser(tx);
    res.send('ok');
  } catch (e) {
    console.error('Rukassa webhook error:', e);
    res.status(500).send('error');
  }
});

// ── POST /wallet/webhook/cryptocloud ─────────────────────────────────────────
router.post('/webhook/cryptocloud', (req, res) => {
  try {
    if (!cryptocloud.verifyWebhook(req.body)) {
      return res.status(400).send('Invalid');
    }
    const { order_id, status } = req.body;
    if (status !== 'success') return res.send('ok');

    const tx = db.prepare('SELECT * FROM transactions WHERE gateway_order_id = ?').get(order_id);
    if (!tx || tx.status === 'completed') return res.send('ok');

    creditUser(tx);
    res.send('ok');
  } catch (e) {
    console.error('CryptoCloud webhook error:', e);
    res.status(500).send('error');
  }
});

// ── POST /wallet/withdraw ─────────────────────────────────────────────────────
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, address, currency = 'USDT' } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt < 5) return res.status(400).json({ error: 'Минимальный вывод $5' });
    if (!address?.trim()) return res.status(400).json({ error: 'Укажите адрес/тег CryptoBot' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (user.balance < amt) return res.status(400).json({ error: 'Недостаточно средств' });

    const withdraw = db.transaction(() => {
      db.prepare('UPDATE users SET balance = balance - ?, total_withdrawn = total_withdrawn + ? WHERE id = ?')
        .run(amt, amt, req.userId);

      db.prepare(`
        INSERT INTO transactions (id, user_id, type, amount, status, description, balance_before, balance_after)
        VALUES (?, ?, 'withdrawal', ?, 'pending', ?, ?, ?)
      `).run(crypto.randomUUID(), req.userId, amt, `Вывод ${currency} → ${address}`,
             user.balance, user.balance - amt);
    });

    withdraw();

    notify.notifyWithdraw(user, amt, currency).catch(() => {});

    // Notify admin
    const admins = db.prepare('SELECT telegram_id FROM users WHERE is_admin = 1 AND telegram_id IS NOT NULL').all();
    admins.forEach(a => {
      notify.sendTg(a.telegram_id,
        `💸 <b>Запрос на вывод</b>\n\n@${user.username}: $${amt.toFixed(2)} ${currency}\nАдрес: <code>${address}</code>`
      ).catch(() => {});
    });

    res.json({ ok: true, message: 'Запрос на вывод создан. Обработка в течение 24ч.' });
  } catch (e) {
    console.error('Withdraw error:', e);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── Internal helper ───────────────────────────────────────────────────────────
function creditUser(tx) {
  const credit = db.transaction(() => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tx.user_id);
    const newBalance = (user.balance || 0) + parseFloat(tx.amount);

    db.prepare('UPDATE users SET balance = ?, total_deposited = total_deposited + ? WHERE id = ?')
      .run(newBalance, parseFloat(tx.amount), tx.user_id);

    db.prepare(`UPDATE transactions SET status = 'completed', balance_before = ?, balance_after = ? WHERE id = ?`)
      .run(user.balance, newBalance, tx.id);

    notify.notifyDeposit({ ...user, balance: newBalance }, tx.amount, tx.gateway_type || tx.currency, tx.gateway_type).catch(() => {});
  });
  credit();
}

module.exports = router;
