const router   = require('express').Router();
const db       = require('../models/db');
const { adminPanelAuth, generateAdminToken } = require('../middleware/auth');
const notify   = require('../utils/notify');
const { completeDeal } = require('./deals');
const { sanitizeUser } = require('./auth');

// ── POST /admin/login ─────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { login, password } = req.body;
  const adminLogin    = process.env.ADMIN_LOGIN    || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

  if (login !== adminLogin || password !== adminPassword) {
    return res.status(401).json({ error: 'Неверные данные' });
  }
  const token = generateAdminToken();
  res.json({ token });
});

// All routes below require admin panel auth
router.use(adminPanelAuth);

// ── GET /admin/stats ──────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const users    = db.prepare(`SELECT COUNT(*) as c FROM users`).get().c;
    const products = db.prepare(`SELECT COUNT(*) as c FROM products WHERE status = 'active'`).get().c;
    const deals    = db.prepare(`SELECT COUNT(*) as c FROM deals`).get().c;
    const revenue  = db.prepare(`SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type = 'commission' AND status = 'completed'`).get().s;
    const recentDeals = db.prepare(`
      SELECT d.*, p.title as product_title, b.username as buyer_username, s.username as seller_username
      FROM deals d
      LEFT JOIN products p ON p.id = d.product_id
      LEFT JOIN users b ON b.id = d.buyer_id
      LEFT JOIN users s ON s.id = d.seller_id
      ORDER BY d.created_at DESC LIMIT 10
    `).all().map(d => ({
      _id: d.id, amount: d.amount, status: d.status,
      product: { title: d.product_title },
      buyer: { username: d.buyer_username },
      seller: { username: d.seller_username }
    }));

    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', datetime(created_at, 'unixepoch')) as month,
             SUM(amount) as revenue, COUNT(*) as deals
      FROM transactions
      WHERE type = 'commission' AND status = 'completed'
        AND created_at > unixepoch() - 180*24*3600
      GROUP BY month ORDER BY month
    `).all();

    res.json({ users, products, deals, revenue, recentDeals, monthlyRevenue });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── GET /admin/users ──────────────────────────────────────────────────────────
router.get('/users', (req, res) => {
  try {
    const { search = '', limit = 50, page = 1 } = req.query;
    const lim    = Math.min(parseInt(limit) || 50, 200);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * lim;

    let users, total;
    if (search.trim()) {
      const q = `%${search.trim()}%`;
      users = db.prepare(`SELECT * FROM users WHERE username LIKE ? OR telegram_id LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(q, q, lim, offset);
      total = db.prepare(`SELECT COUNT(*) as c FROM users WHERE username LIKE ? OR telegram_id LIKE ?`).get(q, q).c;
    } else {
      users = db.prepare(`SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(lim, offset);
      total = db.prepare(`SELECT COUNT(*) as c FROM users`).get().c;
    }

    res.json({ users: users.map(sanitizeUser), total });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /admin/users/:id/ban ─────────────────────────────────────────────────
router.post('/users/:id/ban', (req, res) => {
  try {
    const { hours, reason } = req.body;
    const bannedUntil = hours ? Math.floor(Date.now() / 1000) + parseInt(hours) * 3600 : null;
    db.prepare('UPDATE users SET is_banned = 1, banned_until = ?, ban_reason = ? WHERE id = ?')
      .run(bannedUntil, reason || null, req.params.id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (user?.telegram_id) notify.notifyBanned(user, bannedUntil ? new Date(bannedUntil * 1000) : null, reason).catch(() => {});

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /admin/users/:id/unban ───────────────────────────────────────────────
router.post('/users/:id/unban', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_banned = 0, banned_until = NULL, ban_reason = NULL WHERE id = ?').run(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (user?.telegram_id) notify.notifyUnbanned(user).catch(() => {});
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /admin/users/:id/balance ─────────────────────────────────────────────
router.post('/users/:id/balance', (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    const reason = req.body.reason || 'Admin';
    if (isNaN(amount)) return res.status(400).json({ error: 'Неверная сумма' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Не найден' });

    const newBalance = Math.max(0, (user.balance || 0) + amount);
    db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, req.params.id);

    db.prepare(`INSERT INTO transactions (id, user_id, type, amount, status, description, balance_before, balance_after)
      VALUES (?, ?, 'adjustment', ?, 'completed', ?, ?, ?)`).run(
      require('crypto').randomUUID(), req.params.id, amount, reason, user.balance, newBalance
    );

    if (user.telegram_id) notify.notifyBalanceAdjust(user, amount, reason).catch(() => {});

    res.json({ ok: true, newBalance });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── GET /admin/deals ──────────────────────────────────────────────────────────
router.get('/deals', (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? `WHERE d.status = '${status.replace(/'/g, '')}'` : '';
    const deals = db.prepare(`
      SELECT d.*, p.title as product_title, b.username as buyer_username, s.username as seller_username
      FROM deals d
      LEFT JOIN products p ON p.id = d.product_id
      LEFT JOIN users b ON b.id = d.buyer_id
      LEFT JOIN users s ON s.id = d.seller_id
      ${where}
      ORDER BY d.status = 'disputed' DESC, d.created_at DESC
      LIMIT 100
    `).all().map(d => ({
      _id: d.id, id: d.id, amount: d.amount, status: d.status,
      createdAt: new Date(d.created_at * 1000), disputeReason: d.dispute_reason,
      product: { title: d.product_title },
      buyer: { username: d.buyer_username },
      seller: { username: d.seller_username }
    }));
    res.json({ deals });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /admin/deals/:id/resolve ─────────────────────────────────────────────
router.post('/deals/:id/resolve', (req, res) => {
  try {
    const { decision, note } = req.body;
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Не найдена' });
    if (deal.status !== 'disputed') return res.status(400).json({ error: 'Сделка не в споре' });

    if (decision === 'complete') {
      // Resolve in seller's favor
      completeDeal(deal, 'admin_complete');
      db.prepare('UPDATE deals SET admin_note = ?, resolved_at = unixepoch() WHERE id = ?').run(note || null, deal.id);

    } else if (decision === 'refund') {
      // Refund buyer
      const refund = db.transaction(() => {
        const buyer = db.prepare('SELECT * FROM users WHERE id = ?').get(deal.buyer_id);
        db.prepare('UPDATE users SET balance = balance + ?, frozen_balance = frozen_balance - ? WHERE id = ?')
          .run(deal.amount, deal.amount, deal.buyer_id);
        db.prepare(`UPDATE products SET status = 'active' WHERE id = ?`).run(deal.product_id);
        db.prepare(`UPDATE deals SET status = 'refunded', admin_note = ?, resolved_at = unixepoch(), updated_at = unixepoch() WHERE id = ?`)
          .run(note || null, deal.id);

        db.prepare(`INSERT INTO transactions (id, user_id, type, amount, status, description, deal_id, balance_before, balance_after)
          VALUES (?, ?, 'refund', ?, 'completed', 'Возврат (решение администратора)', ?, ?, ?)`).run(
          require('crypto').randomUUID(), deal.buyer_id, deal.amount, deal.id, buyer.balance, buyer.balance + parseFloat(deal.amount)
        );

        const product = db.prepare('SELECT title FROM products WHERE id = ?').get(deal.product_id);
        notify.notifyDealRefund(buyer, product?.title || '', deal.amount).catch(() => {});
      });
      refund();
    } else {
      return res.status(400).json({ error: 'Неверное решение (complete|refund)' });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── GET /admin/products ───────────────────────────────────────────────────────
router.get('/products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.id, p.title, p.price, p.category, p.status, p.created_at,
             u.username as seller_username
      FROM products p LEFT JOIN users u ON u.id = p.seller_id
      WHERE p.status != 'deleted'
      ORDER BY p.created_at DESC LIMIT 100
    `).all().map(p => ({ ...p, _id: p.id, seller: { username: p.seller_username } }));
    res.json({ products });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── DELETE /admin/products/:id ────────────────────────────────────────────────
router.delete('/products/:id', (req, res) => {
  try {
    db.prepare(`UPDATE products SET status = 'deleted' WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /admin/products/:id/promote ─────────────────────────────────────────
router.post('/products/:id/promote', (req, res) => {
  try {
    const days = parseInt(req.body.days) || 7;
    const until = Math.floor(Date.now() / 1000) + days * 24 * 3600;
    db.prepare('UPDATE products SET is_promoted = 1, promoted_until = ? WHERE id = ?').run(until, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /admin/message — Send TG message to user ────────────────────────────
router.post('/message', (req, res) => {
  try {
    const { userId, text } = req.body;
    if (!userId || !text) return res.status(400).json({ error: 'Заполните поля' });

    const user = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(userId);
    if (!user?.telegram_id) return res.status(404).json({ error: 'Telegram не привязан' });

    notify.sendTg(user.telegram_id, text).then(() => res.json({ ok: true })).catch(e => res.status(500).json({ error: e.message }));
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── GET /admin/transactions ───────────────────────────────────────────────────
router.get('/transactions', (req, res) => {
  try {
    const txs = db.prepare(`
      SELECT t.*, u.username FROM transactions t
      LEFT JOIN users u ON u.id = t.user_id
      ORDER BY t.created_at DESC LIMIT 200
    `).all();
    res.json({ transactions: txs.map(t => ({ ...t, _id: t.id, createdAt: new Date(t.created_at * 1000) })) });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /admin/users/:id/verify ─────────────────────────────────────────────
router.post('/users/:id/verify', (req, res) => {
  try {
    db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = router;
