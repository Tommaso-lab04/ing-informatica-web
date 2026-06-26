const express = require('express');
const router = express.Router();
const db = require('../db');
const { now } = require('../utils/helpers');
const { requireAdmin } = require('../middleware/auth');

router.get('/validate/:code', (req, res) => {
    const c = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(req.params.code.toUpperCase());
    if (!c) return res.status(404).json({ valid: false, error: 'Coupon non valido' });
    if (c.valid_until && new Date(c.valid_until) < new Date()) {
        return res.json({ valid: false, error: 'Coupon scaduto' });
    }
    if (c.max_uses > 0 && c.used_count >= c.max_uses) {
        return res.json({ valid: false, error: 'Coupon esaurito' });
    }
    const subtotal = Number(req.query.subtotal) || 0;
    if (c.min_total && subtotal < c.min_total) {
        return res.json({ valid: false, error: `Spesa minima € ${c.min_total} per usare questo coupon` });
    }
    res.json({
        valid: true,
        code: c.code,
        description: c.description,
        discountPct: c.discount_pct,
        minTotal: c.min_total
    });
});

router.get('/', requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT * FROM coupons ORDER BY code').all());
});

router.post('/', requireAdmin, (req, res) => {
    const { code, description, discountPct, minTotal, validUntil, maxUses } = req.body || {};
    if (!code || !discountPct) return res.status(400).json({ error: 'code e discountPct obbligatori' });
    db.prepare(`
        INSERT INTO coupons (code, description, discount_pct, min_total, valid_until, max_uses, active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(String(code).toUpperCase(),
           description || '',
           parseInt(discountPct),
           Number(minTotal) || 0,
           validUntil || null,
           parseInt(maxUses) || 0);
    res.status(201).json({ ok: true });
});

router.delete('/:code', requireAdmin, (req, res) => {
    db.prepare('UPDATE coupons SET active = 0 WHERE code = ?').run(req.params.code.toUpperCase());
    res.json({ ok: true });
});

module.exports = router;
