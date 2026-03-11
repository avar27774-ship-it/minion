const router  = require('express').Router();
const db      = require('../models/db');
const { auth } = require('../middleware/auth');
const { sanitizeUser } = require('./auth');

// ── GET /users/:id — Public profile ──────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const reviews = db.prepare(`
      SELECT r.*, u.username as reviewer_username, p.title as product_title
      FROM reviews r
      LEFT JOIN users u ON u.id = r.reviewer_id
      LEFT JOIN deals d ON d.id = r.deal_id
      LEFT JOIN products p ON p.id = d.product_id
      WHERE r.reviewed_id = ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `).all(req.params.id);

    const products = db.prepare(`
      SELECT id, title, price, category, status, views, images, created_at
      FROM products WHERE seller_id = ? AND status = 'active'
      ORDER BY is_promoted DESC, created_at DESC LIMIT 12
    `).all(req.params.id).map(p => ({ ...p, _id: p.id, images: JSON.parse(p.images || '[]') }));

    const safe = sanitizeUser(user);
    res.json({
      user: safe,
      reviews: reviews.map(r => ({ ...r, _id: r.id, createdAt: new Date(r.created_at * 1000) })),
      products
    });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── PUT /users/me — Update own profile ───────────────────────────────────────
router.put('/me', auth, (req, res) => {
  try {
    const { bio, firstName, lastName } = req.body;
    db.prepare('UPDATE users SET bio = ?, first_name = ?, last_name = ? WHERE id = ?')
      .run(bio?.slice(0, 300) || null, firstName?.slice(0, 50) || null, lastName?.slice(0, 50) || null, req.userId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    res.json({ user: sanitizeUser(user) });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── GET /users/me/favorites ───────────────────────────────────────────────────
router.get('/me/favorites', auth, (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, u.username as seller_username, u.rating as seller_rating
      FROM favorites f
      JOIN products p ON p.id = f.product_id
      LEFT JOIN users u ON u.id = p.seller_id
      WHERE f.user_id = ? AND p.status != 'deleted'
      ORDER BY f.created_at DESC
    `).all(req.userId).map(p => ({
      ...p, _id: p.id, images: JSON.parse(p.images || '[]'),
      seller: { username: p.seller_username, rating: p.seller_rating }
    }));
    res.json({ products });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = router;
