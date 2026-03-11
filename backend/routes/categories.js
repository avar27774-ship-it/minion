const router = require('express').Router();
const db     = require('../models/db');

router.get('/', (req, res) => {
  try {
    const cats = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order').all();
    res.json({ categories: cats.map(c => ({ ...c, _id: c.id })) });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = router;
