const router = require('express').Router();
const db     = require('../models/db');
const { auth } = require('../middleware/auth');

function parseProduct(p) {
  if (!p) return null;
  p._id       = p.id;
  p.images    = JSON.parse(p.images || '[]');
  p.tags      = JSON.parse(p.tags   || '[]');
  p.favorites = p.fav_count || 0;
  p.isPromoted = !!p.is_promoted;
  p.deliveryType = p.delivery_type;
  if (p.seller_id) {
    p.seller = {
      _id: p.seller_id,
      id: p.seller_id,
      username: p.seller_username,
      firstName: p.seller_first_name,
      rating: p.seller_rating,
      reviewCount: p.seller_review_count,
      totalSales: p.seller_total_sales,
      isVerified: !!p.seller_is_verified
    };
  }
  // Remove raw fields
  delete p.seller_username; delete p.seller_first_name;
  delete p.seller_rating; delete p.seller_review_count;
  delete p.seller_total_sales; delete p.seller_is_verified;
  delete p.fav_count;
  return p;
}

const PRODUCT_SELECT = `
  SELECT p.*,
    (SELECT COUNT(*) FROM favorites f WHERE f.product_id = p.id) as fav_count,
    u.username as seller_username,
    u.first_name as seller_first_name,
    u.rating as seller_rating,
    u.review_count as seller_review_count,
    u.total_sales as seller_total_sales,
    u.is_verified as seller_is_verified
  FROM products p
  LEFT JOIN users u ON u.id = p.seller_id
`;

// ── GET /products ─────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { category, search, sort = 'newest', minPrice, maxPrice, limit = 20, page = 1 } = req.query;
    const lim    = Math.min(parseInt(limit) || 20, 50);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * lim;

    let ids = null;

    // Full-text search via FTS5
    if (search && search.trim()) {
      const q = search.trim().replace(/['"*]/g, '') + '*';
      const ftsRows = db.prepare(`SELECT id FROM products_fts WHERE products_fts MATCH ? ORDER BY rank`).all(q);
      ids = ftsRows.map(r => r.id);
      if (ids.length === 0) return res.json({ products: [], total: 0 });
    }

    const conditions = [`p.status = 'active'`];
    const params     = [];

    if (ids) {
      conditions.push(`p.id IN (${ids.map(() => '?').join(',')})`);
      params.push(...ids);
    }
    if (category)  { conditions.push(`p.category = ?`); params.push(category); }
    if (minPrice)  { conditions.push(`p.price >= ?`);   params.push(parseFloat(minPrice)); }
    if (maxPrice)  { conditions.push(`p.price <= ?`);   params.push(parseFloat(maxPrice)); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const orderMap = {
      newest:     'p.is_promoted DESC, p.created_at DESC',
      price_asc:  'p.is_promoted DESC, p.price ASC',
      price_desc: 'p.is_promoted DESC, p.price DESC',
      popular:    'p.is_promoted DESC, p.views DESC, p.created_at DESC',
    };
    const order = orderMap[sort] || orderMap.newest;

    const total    = db.prepare(`SELECT COUNT(*) as c FROM products p ${where}`).get(...params)?.c || 0;
    const products = db.prepare(`${PRODUCT_SELECT} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, lim, offset);

    res.json({ products: products.map(parseProduct), total });
  } catch (e) {
    console.error('GET /products error:', e);
    res.status(500).json({ error: 'Ошибка загрузки товаров' });
  }
});

// ── GET /products/:id ─────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });

    // Increment views
    db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(req.params.id);
    product.views = (product.views || 0) + 1;

    // Don't expose delivery data in public view
    delete product.delivery_data;
    res.json(parseProduct(product));
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /products ────────────────────────────────────────────────────────────
router.post('/', auth, (req, res) => {
  try {
    const { title, description, price, category, subcategory, game, server, deliveryData, deliveryType, tags } = req.body;
    if (!title || !description || price == null || !category) {
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }
    if (parseFloat(price) <= 0) return res.status(400).json({ error: 'Цена должна быть больше 0' });
    if (title.length > 120) return res.status(400).json({ error: 'Название слишком длинное' });
    if (description.length > 3000) return res.status(400).json({ error: 'Описание слишком длинное' });

    const id = require('crypto').randomUUID();
    db.prepare(`
      INSERT INTO products (id, seller_id, title, description, price, category, subcategory, game, server, delivery_data, delivery_type, tags, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')
    `).run(id, req.userId, title.trim(), description.trim(), parseFloat(price), category,
           subcategory || null, game || null, server || null, deliveryData || null,
           deliveryType || 'manual', JSON.stringify(Array.isArray(tags) ? tags.slice(0, 10) : []));

    const product = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(id);
    delete product.delivery_data;
    res.status(201).json(parseProduct(product));
  } catch (e) {
    console.error('POST /products error:', e);
    res.status(500).json({ error: 'Ошибка создания товара' });
  }
});

// ── PUT /products/:id ─────────────────────────────────────────────────────────
router.put('/:id', auth, (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Не найден' });
    if (product.seller_id !== req.userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    if (['sold', 'frozen'].includes(product.status)) {
      return res.status(400).json({ error: 'Нельзя редактировать товар в активной сделке' });
    }

    const { title, description, price, category, game, deliveryData, deliveryType, tags } = req.body;
    db.prepare(`
      UPDATE products SET
        title = COALESCE(?, title), description = COALESCE(?, description),
        price = COALESCE(?, price), category = COALESCE(?, category),
        game = ?, delivery_data = COALESCE(?, delivery_data),
        delivery_type = COALESCE(?, delivery_type),
        tags = COALESCE(?, tags), updated_at = unixepoch()
      WHERE id = ?
    `).run(title || null, description || null, price ? parseFloat(price) : null,
           category || null, game || null, deliveryData || null,
           deliveryType || null, tags ? JSON.stringify(tags) : null, req.params.id);

    const updated = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(req.params.id);
    delete updated.delivery_data;
    res.json(parseProduct(updated));
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── DELETE /products/:id ──────────────────────────────────────────────────────
router.delete('/:id', auth, (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Не найден' });
    if (product.seller_id !== req.userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    if (product.status === 'frozen') {
      return res.status(400).json({ error: 'Нельзя удалить товар в активной сделке' });
    }
    db.prepare(`UPDATE products SET status = 'deleted' WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── POST /products/:id/favorite ───────────────────────────────────────────────
router.post('/:id/favorite', auth, (req, res) => {
  try {
    const existing = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?').get(req.userId, req.params.id);
    if (existing) {
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(req.userId, req.params.id);
      res.json({ favorited: false });
    } else {
      db.prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)').run(req.userId, req.params.id);
      res.json({ favorited: true });
    }
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// ── GET /products/my/listings ─────────────────────────────────────────────────
router.get('/my/listings', auth, (req, res) => {
  try {
    const products = db.prepare(`${PRODUCT_SELECT} WHERE p.seller_id = ? AND p.status != 'deleted' ORDER BY p.created_at DESC`).all(req.userId);
    res.json({ products: products.map(p => { delete p.delivery_data; return parseProduct(p); }) });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = router;
