const express = require('express');
const router = express.Router();
const db = require('../db');
const { now } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => {
    const items = db.prepare(`
        SELECT p.id, p.name, p.category, p.price, p.eco_score, p.img,
               p.description, p.stock, w.added_at
        FROM wishlist w
        JOIN products p ON p.id = w.product_id
        WHERE w.user_id = ?
        ORDER BY w.added_at DESC
    `).all(req.user.id);
    res.json(items.map(p => ({
        id: p.id, name: p.name, category: p.category, price: p.price,
        ecoScore: p.eco_score, img: p.img, image: p.img,
        description: p.description, stock: p.stock, addedAt: p.added_at
    })));
});

router.post('/', requireAuth, (req, res) => {
    const { productId } = req.body || {};
    if (!productId) return res.status(400).json({ error: 'productId obbligatorio' });
    const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!exists) return res.status(404).json({ error: 'Prodotto inesistente' });
    try {
        db.prepare(`INSERT INTO wishlist (user_id, product_id, added_at) VALUES (?, ?, ?)`)
          .run(req.user.id, productId, now());
    } catch (_) {}
    res.json({ ok: true });
});

router.delete('/:productId', requireAuth, (req, res) => {
    db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?')
      .run(req.user.id, req.params.productId);
    res.json({ ok: true });
});

module.exports = router;
