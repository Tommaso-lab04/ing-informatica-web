const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/public', (req, res) => {
    const totalUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    const totalProducts = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
    const totalOrders = db.prepare('SELECT COUNT(*) AS c FROM orders WHERE status != "cancelled"').get().c;
    const totalCo2 = db.prepare('SELECT COALESCE(SUM(co2_saved_total), 0) AS s FROM orders WHERE status != "cancelled"').get().s;
    const totalPosts = db.prepare('SELECT COUNT(*) AS c FROM posts').get().c;
    const totalRevenue = db.prepare('SELECT COALESCE(SUM(total),0) AS s FROM orders WHERE status != "cancelled"').get().s;

    const topCategories = db.prepare(`
        SELECT p.category, SUM(oi.quantity) AS units
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled'
        GROUP BY p.category
        ORDER BY units DESC
        LIMIT 5
    `).all();

    res.json({
        totalUsers, totalProducts, totalOrders, totalPosts,
        totalCo2Saved: Math.round(totalCo2 * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        topCategories
    });
});

router.get('/me', requireAuth, (req, res) => {
    const orders = db.prepare(`
        SELECT id, total, co2_saved_total, created_at
        FROM orders
        WHERE user_id = ? AND status != 'cancelled'
    `).all(req.user.id);

    const totalCo2 = orders.reduce((s, o) => s + (o.co2_saved_total || 0), 0);
    const totalSpent = orders.reduce((s, o) => s + o.total, 0);
    const ordersCount = orders.length;

    const reviewsCount = db.prepare('SELECT COUNT(*) AS c FROM reviews WHERE user_id = ?').get(req.user.id).c;
    const postsCount = db.prepare('SELECT COUNT(*) AS c FROM posts WHERE author_id = ?').get(req.user.id).c;
    const wishlistCount = db.prepare('SELECT COUNT(*) AS c FROM wishlist WHERE user_id = ?').get(req.user.id).c;

    res.json({
        ecoPoints: req.user.eco_points,
        totalCo2Saved: Math.round(totalCo2 * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        ordersCount, reviewsCount, postsCount, wishlistCount
    });
});

module.exports = router;
