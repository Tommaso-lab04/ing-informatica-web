const express = require('express');
const router = express.Router();
const db = require('../db');
const { newId, now, money } = require('../utils/helpers');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function mapOrder(o, items) {
    return {
        id: o.id,
        userId: o.user_id,
        items: items.map(i => ({
            productId: i.product_id,
            name: i.name,
            price: i.price,
            quantity: i.quantity
        })),
        total: o.total,
        discount: o.discount,
        couponCode: o.coupon_code,
        co2Saved: o.co2_saved_total,
        shippingAddress: { street: o.ship_street, city: o.ship_city, zip: o.ship_zip },
        status: o.status,
        createdAt: o.created_at,
        updatedAt: o.updated_at
    };
}

router.post('/', requireAuth, (req, res) => {
    const { shippingAddress, couponCode } = req.body || {};
    if (!shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.zip) {
        return res.status(400).json({ error: 'Indirizzo di spedizione incompleto' });
    }
    if (!/^\d{5}$/.test(String(shippingAddress.zip))) {
        return res.status(400).json({ error: 'CAP deve essere di 5 cifre' });
    }

    const items = db.prepare(`
        SELECT ci.product_id, ci.quantity,
               p.name, p.price, p.stock, p.co2_saved
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.user_id = ?
    `).all(req.user.id);

    if (items.length === 0) return res.status(400).json({ error: 'Il carrello è vuoto' });

    for (const it of items) {
        if (it.quantity > it.stock) {
            return res.status(400).json({ error: `Stock insufficiente per "${it.name}"` });
        }
    }

    let total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const co2Tot = items.reduce((s, i) => s + (i.co2_saved || 0) * i.quantity, 0);
    let discount = 0;
    let appliedCoupon = null;

    if (couponCode) {
        const c = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(couponCode);
        if (!c) return res.status(400).json({ error: 'Coupon non valido' });
        if (c.valid_until && new Date(c.valid_until) < new Date()) {
            return res.status(400).json({ error: 'Coupon scaduto' });
        }
        if (c.max_uses > 0 && c.used_count >= c.max_uses) {
            return res.status(400).json({ error: 'Coupon esaurito' });
        }
        if (c.min_total && total < c.min_total) {
            return res.status(400).json({ error: `Spesa minima € ${c.min_total} per usare questo coupon` });
        }
        discount = money(total * c.discount_pct / 100);
        total = money(total - discount);
        appliedCoupon = c.code;
    }

    total = money(total);
    const id = newId('ord');
    const t = now();

    const txn = db.transaction(() => {
        db.prepare(`
            INSERT INTO orders (id, user_id, total, discount, coupon_code, status,
                                ship_street, ship_city, ship_zip,
                                co2_saved_total, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?)
        `).run(id, req.user.id, total, discount, appliedCoupon,
               shippingAddress.street, shippingAddress.city, String(shippingAddress.zip),
               money(co2Tot), t, t);

        const insItem = db.prepare(`
            INSERT INTO order_items (order_id, product_id, name, price, quantity)
            VALUES (?, ?, ?, ?, ?)
        `);
        const decStock = db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`);
        for (const i of items) {
            insItem.run(id, i.product_id, i.name, i.price, i.quantity);
            decStock.run(i.quantity, i.product_id);
        }

        if (appliedCoupon) {
            db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').run(appliedCoupon);
        }

        const points = Math.floor(total);
        db.prepare('UPDATE users SET eco_points = eco_points + ? WHERE id = ?')
          .run(points, req.user.id);

        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    });
    txn();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    res.status(201).json(mapOrder(order, orderItems));
});

router.get('/', requireAuth, (req, res) => {
    const orders = db.prepare(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id);

    const result = orders.map(o => {
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
        return mapOrder(o, items);
    });
    res.json(result);
});

router.get('/:id', requireAuth, (req, res) => {
    const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!o) return res.status(404).json({ error: 'Ordine non trovato' });
    if (o.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Non autorizzato' });
    }
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    res.json(mapOrder(o, items));
});

router.post('/:id/cancel', requireAuth, (req, res) => {
    const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!o) return res.status(404).json({ error: 'Ordine non trovato' });
    if (o.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorizzato' });
    if (o.status !== 'confirmed') return res.status(400).json({ error: 'Solo ordini confermati sono annullabili' });

    const ageHours = (Date.now() - new Date(o.created_at).getTime()) / 3_600_000;
    if (ageHours > 24) return res.status(400).json({ error: 'Annullamento possibile solo entro 24h' });

    const txn = db.transaction(() => {
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
        const restock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
        for (const i of items) restock.run(i.quantity, i.product_id);
        db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
          .run('cancelled', now(), o.id);
    });
    txn();
    res.json({ ok: true, status: 'cancelled' });
});

router.patch('/:id/status', requireAdmin, (req, res) => {
    const allowed = ['confirmed', 'shipped', 'delivered', 'cancelled'];
    const { status } = req.body || {};
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Stato non valido' });
    const r = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
                .run(status, now(), req.params.id);
    if (r.changes === 0) return res.status(404).json({ error: 'Ordine non trovato' });
    db.prepare(`INSERT INTO admin_log (admin_id, action, target, details, created_at)
                VALUES (?, 'order.status', ?, ?, ?)`)
      .run(req.user.id, req.params.id, status, now());
    res.json({ ok: true });
});

module.exports = router;
