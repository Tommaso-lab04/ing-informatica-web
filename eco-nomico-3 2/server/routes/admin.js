const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

router.get('/dashboard', (req, res) => {
    const u = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    const p = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
    const o = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
    const o7 = db.prepare(`SELECT COUNT(*) AS c FROM orders
                           WHERE created_at > datetime('now', '-7 days')`).get().c;
    const rev = db.prepare(`SELECT COALESCE(SUM(total),0) AS s
                            FROM orders WHERE status != 'cancelled'`).get().s;
    const rev7 = db.prepare(`SELECT COALESCE(SUM(total),0) AS s FROM orders
                             WHERE status != 'cancelled' AND created_at > datetime('now','-7 days')`).get().s;
    const lowStock = db.prepare(`SELECT id, name, stock FROM products WHERE stock < 10 ORDER BY stock ASC`).all();

    const byStatus = db.prepare(`SELECT status, COUNT(*) AS c FROM orders GROUP BY status`).all();

    const topProducts = db.prepare(`
        SELECT p.id, p.name, SUM(oi.quantity) AS units, SUM(oi.quantity * oi.price) AS revenue
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled'
        GROUP BY p.id
        ORDER BY units DESC
        LIMIT 5
    `).all();

    res.json({
        users: u, products: p, orders: o, ordersLast7Days: o7,
        revenue: Math.round(rev * 100) / 100,
        revenueLast7Days: Math.round(rev7 * 100) / 100,
        lowStock, byStatus, topProducts
    });
});

router.get('/users', (req, res) => {
    res.json(db.prepare(`
        SELECT id, username, email, role, eco_points, avatar, created_at
        FROM users ORDER BY created_at DESC
    `).all());
});

router.patch('/users/:id/role', (req, res) => {
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Ruolo non valido' });
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    res.json({ ok: true });
});

router.delete('/users/:id', (req, res) => {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Non puoi eliminare te stesso' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

router.get('/orders', (req, res) => {
    const orders = db.prepare(`
        SELECT o.*, u.username
        FROM orders o JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
    `).all();
    res.json(orders.map(o => ({
        id: o.id,
        user: { id: o.user_id, username: o.username },
        total: o.total,
        status: o.status,
        co2Saved: o.co2_saved_total,
        couponCode: o.coupon_code,
        shippingAddress: { street: o.ship_street, city: o.ship_city, zip: o.ship_zip },
        createdAt: o.created_at,
        updatedAt: o.updated_at
    })));
});

router.get('/log', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    res.json(db.prepare(`
        SELECT a.*, u.username AS adminName
        FROM admin_log a LEFT JOIN users u ON u.id = a.admin_id
        ORDER BY a.id DESC
        LIMIT ?
    `).all(limit));
});

module.exports = router;
