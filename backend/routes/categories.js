const router = require('express').Router();
const { queryAll } = require('../models/db');

router.get('/', async (req, res) => {
  try {
    const cats = await queryAll('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order');
    res.json({ categories: cats.map(c => ({ ...c, _id: c.id })) });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = router;
