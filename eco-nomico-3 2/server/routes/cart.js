const express = require('express');
const router = express.Router();
const db = require('../db');
const { now, money } = require('../utils/helpers');

function dbGetCart(userId) {
    const items = db.prepare(`
        SELECT ci.product_id, ci.quantity,
               p.id, p.name, p.category, p.price, p.stock, p.eco_score, p.co2_saved,
               p.description, p.img
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.user_id = ?
        ORDER BY ci.added_at DESC
    `).all(userId);

    const mapped = items.map(i => {
        const product = {
            id: i.id, name: i.name, category: i.category, price: i.price,
            stock: i.stock, ecoScore: i.eco_score, co2Saved: i.co2_saved,
            description: i.description, img: i.img, image: i.img
        };
        return {
            productId: i.product_id,
            quantity: i.quantity,
            product,
            subtotal: money(i.price * i.quantity)
        };
    });
    const total = money(mapped.reduce((s, x) => s + x.subtotal, 0));
    const co2 = money(mapped.reduce((s, x) => s + (x.product.co2Saved || 0) * x.quantity, 0));
    return { items: mapped, total, co2Saved: co2 };
}

function guestGetCart(req) {
    const guest = req.session.guestCart || [];
    if (guest.length === 0) return { items: [], total: 0, co2Saved: 0 };

    const placeholders = guest.map(() => '?').join(',');
    const products = db.prepare(
        `SELECT * FROM products WHERE id IN (${placeholders})`
    ).all(...guest.map(g => g.productId));

    const mapped = guest.map(g => {
        const p = products.find(x => x.id === g.productId);
        if (!p) return null;
        const product = {
            id: p.id, name: p.name, category: p.category, price: p.price,
            stock: p.stock, ecoScore: p.eco_score, co2Saved: p.co2_saved,
            description: p.description, img: p.img, image: p.img
        };
        return {
            productId: g.productId,
            quantity: g.quantity,
            product,
            subtotal: money(p.price * g.quantity)
        };
    }).filter(Boolean);

    const total = money(mapped.reduce((s, x) => s + x.subtotal, 0));
    const co2 = money(mapped.reduce((s, x) => s + (x.product.co2Saved || 0) * x.quantity, 0));
    return { items: mapped, total, co2Saved: co2 };
}

router.get('/', (req, res) => {
    if (req.user) return res.json(dbGetCart(req.user.id));
    res.json(guestGetCart(req));
});

router.post('/', (req, res) => {
    const { productId, quantity = 1 } = req.body || {};
    if (!productId) return res.status(400).json({ error: 'productId obbligatorio' });
    const q = parseInt(quantity);
    if (!Number.isInteger(q) || q < 1) return res.status(400).json({ error: 'Quantità non valida' });

    const product = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(404).json({ error: 'Prodotto inesistente' });

    if (req.user) {
        const existing = db.prepare(
            'SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?'
        ).get(req.user.id, productId);
        const newQ = (existing?.quantity || 0) + q;
        if (newQ > product.stock) {
            return res.status(400).json({ error: `Solo ${product.stock} pezzi disponibili` });
        }

        if (existing) {
            db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?')
              .run(newQ, req.user.id, productId);
        } else {
            db.prepare(`INSERT INTO cart_items (user_id, product_id, quantity, added_at)
                        VALUES (?, ?, ?, ?)`)
              .run(req.user.id, productId, q, now());
        }
        return res.json(dbGetCart(req.user.id));
    }

    if (!req.session.guestCart) req.session.guestCart = [];
    const item = req.session.guestCart.find(i => i.productId === productId);
    const newQ = (item?.quantity || 0) + q;
    if (newQ > product.stock) {
        return res.status(400).json({ error: `Solo ${product.stock} pezzi disponibili` });
    }
    if (item) item.quantity = newQ;
    else req.session.guestCart.push({ productId, quantity: q });
    res.json(guestGetCart(req));
});

router.patch('/:productId', (req, res) => {
    const { productId } = req.params;
    const q = parseInt(req.body?.quantity);
    if (!Number.isInteger(q) || q < 1) return res.status(400).json({ error: 'Quantità non valida' });

    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(404).json({ error: 'Prodotto inesistente' });
    if (q > product.stock) return res.status(400).json({ error: `Solo ${product.stock} pezzi disponibili` });

    if (req.user) {
        const r = db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?')
                    .run(q, req.user.id, productId);
        if (r.changes === 0) return res.status(404).json({ error: 'Prodotto non nel carrello' });
        return res.json(dbGetCart(req.user.id));
    }
    const item = (req.session.guestCart || []).find(i => i.productId === productId);
    if (!item) return res.status(404).json({ error: 'Prodotto non nel carrello' });
    item.quantity = q;
    res.json(guestGetCart(req));
});

router.delete('/:productId', (req, res) => {
    if (req.user) {
        db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?')
          .run(req.user.id, req.params.productId);
        return res.json(dbGetCart(req.user.id));
    }
    if (req.session.guestCart) {
        req.session.guestCart = req.session.guestCart.filter(i => i.productId !== req.params.productId);
    }
    res.json(guestGetCart(req));
});

router.delete('/', (req, res) => {
    if (req.user) {
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
        return res.json(dbGetCart(req.user.id));
    }
    req.session.guestCart = [];
    res.json(guestGetCart(req));
});

module.exports = router;
module.exports.dbGetCart = dbGetCart;
