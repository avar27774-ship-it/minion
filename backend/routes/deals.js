const router  = require('express').Router();
const db      = require('../models/db');
const { auth } = require('../middleware/auth');
const notify  = require('../utils/notify');

const COMMISSION_RATE = 0.05; // 5%
const AUTO_COMPLETE_HOURS = 72;

function parseDeal(d) {
  if (!d) return null;
  d._id = d.id;
  d.amount       = parseFloat(d.amount);
  d.sellerAmount = parseFloat(d.seller_amount);
  d.commission   = parseFloat(d.commission);
  d.deliveryData = d.delivery_data;
  d.deliveredAt  = d.delivered_at ? new Date(d.delivered_at * 1000) : null;
  d.autoCompleteAt = d.auto_complete_at ? new Date(d.auto_complete_at * 1000) : null;
  d.buyerConfirmed = !!d.buyer_confirmed;
  d.sellerConfirmed = !!d.seller_confirmed;
  d.createdAt    = new Date(d.created_at * 1000);
  d.updatedAt    = new Date(d.updated_at * 1000);

  if (d.product_title) {
    d.product = { _id: d.product_id, id: d.product_id, title: d.product_title, price: d.product_price };
  }
  if (d.buyer_username !== undefined) {
    d.buyer  = { _id: d.buyer_id, id: d.buyer_id, username: d.buyer_username, firstName: d.buyer_first_name };
    d.seller = { _id: d.seller_id, id: d.seller_id, username: d.seller_username, firstName: d.seller_first_name };
  }

  // Clean up raw fields
  ['product_title','product_price','buyer_username','buyer_first_name',
   'seller_username','seller_first_name','delivery_data','delivered_at',
   'auto_complete_at','buyer_confirmed','seller_confirmed','seller_amount'].forEach(k => delete d[k]);
  return d;
}

const DEAL_SELECT = `
  SELECT d.*,
    p.title as product_title, p.price as product_price,
    b.username as buyer_username, b.first_name as buyer_first_name,
    s.username as seller_username, s.first_name as seller_first_name,
    (SELECT json_group_array(json_object(
      'sender', dm.sender_id, 'text', dm.text, 'isSystem', dm.is_system,
      'timestamp', dm.created_at
    )) FROM deal_messages dm WHERE dm.deal_id = d.id ORDER BY dm.created_at ASC) as messages_raw
  FROM deals d
  LEFT JOIN products p ON p.id = d.product_id
  LEFT JOIN users b ON b.id = d.buyer_id
  LEFT JOIN users s ON s.id = d.seller_id
`;

function parseMessages(d) {
  try {
    d.messages = JSON.parse(d.messages_raw || '[]').map(m => ({
      sender: m.sender, text: m.text, isSystem: !!m.isSystem,
      timestamp: new Date(m.timestamp * 1000)
    }));
  } catch { d.messages = []; }
  delete d.messages_raw;
  return d;
}

function addSystemMessage(dealId, text) {
  db.prepare(`INSERT INTO deal_messages (deal_id, is_system, text) VALUES (?, 1, ?)`).run(dealId, text);
}

// ── GET /deals ────────────────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  try {
    const { role = 'all' } = req.query;
    let condition = '';
    if (role === 'buyer')  condition = `WHERE d.buyer_id = '${req.userId}'`;
    else if (role === 'seller') condition = `WHERE d.seller_id = '${req.userId}'`;
    else condition = `WHERE d.buyer_id = '${req.userId}' OR d.seller_id = '${req.userId}'`;

    const deals = db.prepare(`${DEAL_SELECT} ${condition} ORDER BY d.created_at DESC LIMIT 50`).all();
    res.json(deals.map(d => { delete d.messages_raw; return parseDeal(d); }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── GET /deals/:id ────────────────────────────────────────────────────────────
router.get('/:id', auth, (req, res) => {
  try {
    const deal = db.prepare(`${DEAL_SELECT} WHERE d.id = ?`).get(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Сделка не найдена' });
    if (deal.buyer_id !== req.userId && deal.seller_id !== req.userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    // Only reveal delivery_data to buyer after delivery
    const parsed = parseDeal(parseMessages(deal));
    if (deal.buyer_id !== req.userId) delete parsed.deliveryData;

    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /deals — Create deal (buy product) ───────────────────────────────────
router.post('/', auth, (req, res) => {
  try {
    const { productId } = req.body;
    const product = db.prepare(`SELECT * FROM products WHERE id = ? AND status = 'active'`).get(productId);
    if (!product) return res.status(404).json({ error: 'Товар не найден или недоступен' });
    if (product.seller_id === req.userId) return res.status(400).json({ error: 'Нельзя купить свой товар' });

    const buyer = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (buyer.balance < product.price) {
      return res.status(400).json({ error: `Недостаточно средств. Ваш баланс: $${parseFloat(buyer.balance).toFixed(2)}` });
    }

    const seller = db.prepare('SELECT * FROM users WHERE id = ?').get(product.seller_id);
    const amount = parseFloat(product.price);
    const commission = Math.round(amount * COMMISSION_RATE * 100) / 100;
    const sellerAmount = Math.round((amount - commission) * 100) / 100;

    const dealId = require('crypto').randomUUID();

    // Atomic transaction: deduct balance, freeze, create deal
    const createDeal = db.transaction(() => {
      // Freeze buyer funds
      db.prepare('UPDATE users SET balance = balance - ?, frozen_balance = frozen_balance + ? WHERE id = ?')
        .run(amount, amount, req.userId);

      // Freeze product
      db.prepare(`UPDATE products SET status = 'frozen' WHERE id = ?`).run(productId);

      // Create deal
      db.prepare(`
        INSERT INTO deals (id, buyer_id, seller_id, product_id, amount, seller_amount, commission, status, auto_complete_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(dealId, req.userId, product.seller_id, productId, amount, sellerAmount, commission,
             Math.floor(Date.now() / 1000) + AUTO_COMPLETE_HOURS * 3600);

      // Log buyer transaction
      db.prepare(`
        INSERT INTO transactions (id, user_id, type, amount, status, description, deal_id, balance_before, balance_after)
        VALUES (?, ?, 'purchase', ?, 'completed', ?, ?, ?, ?)
      `).run(require('crypto').randomUUID(), req.userId, amount,
             `Покупка: ${product.title}`, dealId, buyer.balance, buyer.balance - amount);

      addSystemMessage(dealId, `✅ Сделка открыта. Покупатель зарезервировал $${amount.toFixed(2)}.`);
    });

    createDeal();

    // Notify both parties
    notify.notifyPurchase(buyer, seller, product.title, amount).catch(() => {});

    const deal = db.prepare(`${DEAL_SELECT} WHERE d.id = ?`).get(dealId);
    res.status(201).json(parseDeal(parseMessages(deal)));
  } catch (e) {
    console.error('Create deal error:', e);
    res.status(500).json({ error: 'Ошибка создания сделки' });
  }
});

// ── POST /deals/:id/deliver — Seller delivers goods ──────────────────────────
router.post('/:id/deliver', auth, (req, res) => {
  try {
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Не найдена' });
    if (deal.seller_id !== req.userId) return res.status(403).json({ error: 'Нет доступа' });
    if (deal.status !== 'active') return res.status(400).json({ error: 'Сделка не активна' });
    if (deal.delivered_at) return res.status(400).json({ error: 'Товар уже передан' });

    const { deliveryData } = req.body;
    if (!deliveryData?.trim()) return res.status(400).json({ error: 'Введите данные товара' });

    // Reset auto-complete timer from delivery moment
    const newAutoComplete = Math.floor(Date.now() / 1000) + AUTO_COMPLETE_HOURS * 3600;

    db.prepare(`
      UPDATE deals SET delivery_data = ?, delivered_at = unixepoch(), auto_complete_at = ?, updated_at = unixepoch()
      WHERE id = ?
    `).run(deliveryData.trim(), newAutoComplete, req.params.id);

    addSystemMessage(req.params.id, `📦 Продавец передал товар. Проверьте и подтвердите получение в течение 72 часов.`);

    const buyer = db.prepare('SELECT * FROM users WHERE id = ?').get(deal.buyer_id);
    const product = db.prepare('SELECT title FROM products WHERE id = ?').get(deal.product_id);
    if (buyer?.telegram_id) {
      notify.notifyMessage(buyer, 'Продавец', product?.title || 'Сделка').catch(() => {});
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /deals/:id/confirm — Buyer confirms receipt ─────────────────────────
router.post('/:id/confirm', auth, (req, res) => {
  try {
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Не найдена' });
    if (deal.buyer_id !== req.userId) return res.status(403).json({ error: 'Нет доступа' });
    if (deal.status !== 'active') return res.status(400).json({ error: 'Сделка не активна' });

    completeDeal(deal, 'buyer_confirm');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка завершения сделки' });
  }
});

// ── POST /deals/:id/dispute — Buyer opens dispute ────────────────────────────
router.post('/:id/dispute', auth, (req, res) => {
  try {
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Не найдена' });
    if (deal.buyer_id !== req.userId) return res.status(403).json({ error: 'Нет доступа' });
    if (deal.status !== 'active') return res.status(400).json({ error: 'Нельзя открыть спор' });
    if (!deal.delivered_at) return res.status(400).json({ error: 'Товар ещё не передан' });

    const { reason } = req.body;
    db.prepare(`UPDATE deals SET status = 'disputed', dispute_reason = ?, updated_at = unixepoch() WHERE id = ?`)
      .run(reason || 'Без причины', req.params.id);

    addSystemMessage(req.params.id, `⚠️ Покупатель открыл спор: "${reason || '—'}". Администратор рассмотрит в течение 24ч.`);

    const buyer  = db.prepare('SELECT * FROM users WHERE id = ?').get(deal.buyer_id);
    const seller = db.prepare('SELECT * FROM users WHERE id = ?').get(deal.seller_id);
    const product = db.prepare('SELECT title FROM products WHERE id = ?').get(deal.product_id);
    notify.notifyDealDispute(buyer, seller, product?.title || '').catch(() => {});

    // Notify admins
    const admins = db.prepare('SELECT telegram_id FROM users WHERE is_admin = 1 AND telegram_id IS NOT NULL').all();
    admins.forEach(a => {
      notify.sendTg(a.telegram_id, `🚨 <b>Новый спор!</b>\n\nТовар: ${product?.title}\nПокупатель: @${buyer.username}\nПродавец: @${seller.username}\nПричина: ${reason}`).catch(() => {});
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /deals/:id/message — Send chat message ───────────────────────────────
router.post('/:id/message', auth, (req, res) => {
  try {
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Не найдена' });
    if (deal.buyer_id !== req.userId && deal.seller_id !== req.userId) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    if (!['active', 'disputed'].includes(deal.status)) {
      return res.status(400).json({ error: 'Нельзя писать в закрытой сделке' });
    }

    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Пустое сообщение' });
    if (text.length > 2000) return res.status(400).json({ error: 'Сообщение слишком длинное' });

    db.prepare(`INSERT INTO deal_messages (deal_id, sender_id, text) VALUES (?, ?, ?)`).run(req.params.id, req.userId, text.trim());

    // Notify the other party
    const otherId = deal.buyer_id === req.userId ? deal.seller_id : deal.buyer_id;
    const other   = db.prepare('SELECT * FROM users WHERE id = ?').get(otherId);
    const sender  = db.prepare('SELECT username FROM users WHERE id = ?').get(req.userId);
    const product = db.prepare('SELECT title FROM products WHERE id = ?').get(deal.product_id);
    if (other?.telegram_id) {
      notify.notifyMessage(other, '@' + (sender?.username || '?'), product?.title || 'Сделка').catch(() => {});
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /deals/:id/review — Leave review after deal ─────────────────────────
router.post('/:id/review', auth, (req, res) => {
  try {
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Не найдена' });
    if (deal.buyer_id !== req.userId) return res.status(403).json({ error: 'Только покупатель может оставить отзыв' });
    if (deal.status !== 'completed') return res.status(400).json({ error: 'Сделка не завершена' });

    const existing = db.prepare('SELECT id FROM reviews WHERE deal_id = ?').get(req.params.id);
    if (existing) return res.status(409).json({ error: 'Отзыв уже оставлен' });

    const { rating, text } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Оценка от 1 до 5' });

    const reviewId = require('crypto').randomUUID();
    db.prepare(`INSERT INTO reviews (id, deal_id, reviewer_id, reviewed_id, rating, text) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(reviewId, req.params.id, req.userId, deal.seller_id, parseInt(rating), text?.slice(0, 500) || null);

    // Recalculate seller rating
    const stats = db.prepare(`SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE reviewed_id = ?`).get(deal.seller_id);
    db.prepare('UPDATE users SET rating = ?, review_count = ? WHERE id = ?')
      .run(Math.round(stats.avg * 10) / 10, stats.cnt, deal.seller_id);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── Internal: completeDeal ─────────────────────────────────────────────────────
function completeDeal(deal, reason = 'auto') {
  const complete = db.transaction(() => {
    const seller = db.prepare('SELECT * FROM users WHERE id = ?').get(deal.seller_id);
    const buyer  = db.prepare('SELECT * FROM users WHERE id = ?').get(deal.buyer_id);
    const product = db.prepare('SELECT title FROM products WHERE id = ?').get(deal.product_id);
    const sellerAmount = parseFloat(deal.seller_amount);
    const amount = parseFloat(deal.amount);

    // Credit seller
    db.prepare('UPDATE users SET balance = balance + ?, frozen_balance = frozen_balance - ?, total_sales = total_sales + 1 WHERE id = ?')
      .run(sellerAmount, amount, deal.seller_id);

    // Update buyer stats
    db.prepare('UPDATE users SET frozen_balance = frozen_balance - ?, total_purchases = total_purchases + 1 WHERE id = ?')
      .run(amount, deal.buyer_id);

    // Mark product sold
    db.prepare(`UPDATE products SET status = 'sold' WHERE id = ?`).run(deal.product_id);

    // Complete deal
    db.prepare(`UPDATE deals SET status = 'completed', buyer_confirmed = 1, updated_at = unixepoch() WHERE id = ?`).run(deal.id);

    // Log seller transaction
    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, status, description, deal_id, balance_before, balance_after)
      VALUES (?, ?, 'sale', ?, 'completed', ?, ?, ?, ?)
    `).run(require('crypto').randomUUID(), deal.seller_id, sellerAmount,
           `Продажа: ${product?.title}`, deal.id, seller.balance, seller.balance + sellerAmount);

    // Log commission
    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, status, description, deal_id)
      VALUES (?, ?, 'commission', ?, 'completed', ?, ?)
    `).run(require('crypto').randomUUID(), deal.seller_id, deal.commission,
           `Комиссия 5%: ${product?.title}`, deal.id);

    addSystemMessage(deal.id, reason === 'auto'
      ? `✅ Сделка автоматически завершена (72ч без спора). Деньги переведены продавцу.`
      : `✅ Покупатель подтвердил получение. Деньги переведены продавцу.`
    );

    notify.notifyDealComplete(buyer, seller, product?.title || '', sellerAmount).catch(() => {});
  });

  complete();
}

module.exports = router;
module.exports.completeDeal = completeDeal;
