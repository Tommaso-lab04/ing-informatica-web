const express = require('express');
const router = express.Router();
const db = require('../db');
const { newId, now, money } = require('../utils/helpers');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function mapProduct(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        price: row.price,
        stock: row.stock,
        ecoScore: row.eco_score,
        co2Saved: row.co2_saved,
        description: row.description,
        img: row.img,
        image: row.img,
        avgRating: row.avg_rating != null ? Number(Number(row.avg_rating).toFixed(2)) : null,
        reviewCount: row.review_count != null ? row.review_count : 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

router.get('/', (req, res) => {
    const { q, category, maxPrice, minEco, sort } = req.query;

    let sql = `
        SELECT p.*,
               COALESCE(AVG(r.rating), 0) AS avg_rating,
               COUNT(r.id)                AS review_count
        FROM products p
        LEFT JOIN reviews r ON r.product_id = p.id
        WHERE 1=1
    `;
    const params = [];

    if (q) {
        sql += ` AND (LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ?)`;
        const like = `%${String(q).toLowerCase()}%`;
        params.push(like, like);
    }
    if (category) {
        sql += ` AND p.category = ?`;
        params.push(String(category));
    }
    if (maxPrice != null && maxPrice !== '') {
        sql += ` AND p.price <= ?`;
        params.push(Number(maxPrice));
    }
    if (minEco != null && minEco !== '') {
        sql += ` AND p.eco_score >= ?`;
        params.push(Number(minEco));
    }

    sql += ` GROUP BY p.id`;

    const sortMap = {
        'price-asc':  ' ORDER BY p.price ASC',
        'price-desc': ' ORDER BY p.price DESC',
        'eco-desc':   ' ORDER BY p.eco_score DESC',
        'name':       ' ORDER BY p.name COLLATE NOCASE',
        'newest':     ' ORDER BY p.created_at DESC'
    };
    sql += sortMap[sort] || ' ORDER BY p.name COLLATE NOCASE';

    const rows = db.prepare(sql).all(...params);
    res.json(rows.map(mapProduct));
});

router.get('/categories', (req, res) => {
    const rows = db.prepare(`SELECT DISTINCT category FROM products ORDER BY category`).all();
    res.json(rows.map(r => r.category));
});

router.get('/:id', (req, res) => {
    const row = db.prepare(`
        SELECT p.*,
               COALESCE(AVG(r.rating), 0) AS avg_rating,
               COUNT(r.id)                AS review_count
        FROM products p
        LEFT JOIN reviews r ON r.product_id = p.id
        WHERE p.id = ?
        GROUP BY p.id
    `).get(req.params.id);

    if (!row) return res.status(404).json({ error: 'Prodotto non trovato' });
    res.json(mapProduct(row));
});

router.get('/:id/reviews', (req, res) => {
    const rows = db.prepare(`
        SELECT r.id, r.rating, r.title, r.content, r.created_at,
               u.username AS authorName, r.user_id AS authorId
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
    `).all(req.params.id);
    res.json(rows);
});

router.post('/:id/reviews', requireAuth, (req, res) => {
    const { rating, title, content } = req.body || {};
    const r = parseInt(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
        return res.status(400).json({ error: 'Rating tra 1 e 5' });
    }
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Prodotto non trovato' });

    try {
        const id = newId('rev');
        db.prepare(`
            INSERT INTO reviews (id, product_id, user_id, rating, title, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, req.params.id, req.user.id, r,
               (title || '').slice(0, 120),
               (content || '').slice(0, 2000),
               now());
        db.prepare('UPDATE users SET eco_points = eco_points + 5 WHERE id = ?').run(req.user.id);
        res.status(201).json({ id, ok: true });
    } catch (e) {
        if (String(e.message).includes('UNIQUE')) {
            return res.status(409).json({ error: 'Hai già recensito questo prodotto' });
        }
        throw e;
    }
});

router.post('/', requireAdmin, (req, res) => {
    const { name, category, price, stock, ecoScore, co2Saved, description, img } = req.body || {};
    if (!name || !category || price == null) {
        return res.status(400).json({ error: 'name, category e price obbligatori' });
    }
    const id = newId('p');
    const t = now();
    db.prepare(`
        INSERT INTO products (id, name, category, price, stock, eco_score, co2_saved,
                              description, img, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, category, money(price),
           parseInt(stock) || 0,
           parseInt(ecoScore) || 5,
           Number(co2Saved) || 0,
           description || '',
           img || '',
           t, t);
    db.prepare(`INSERT INTO admin_log (admin_id, action, target, details, created_at)
                VALUES (?, 'product.create', ?, ?, ?)`)
      .run(req.user.id, id, JSON.stringify({ name, price }), t);
    res.status(201).json({ id });
});

router.patch('/:id', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Prodotto non trovato' });

    const { name, category, price, stock, ecoScore, co2Saved, description, img } = req.body || {};
    db.prepare(`
        UPDATE products SET
            name        = COALESCE(?, name),
            category    = COALESCE(?, category),
            price       = COALESCE(?, price),
            stock       = COALESCE(?, stock),
            eco_score   = COALESCE(?, eco_score),
            co2_saved   = COALESCE(?, co2_saved),
            description = COALESCE(?, description),
            img         = COALESCE(?, img),
            updated_at  = ?
        WHERE id = ?
    `).run(
        name ?? null,
        category ?? null,
        price != null ? money(price) : null,
        stock != null ? parseInt(stock) : null,
        ecoScore != null ? parseInt(ecoScore) : null,
        co2Saved != null ? Number(co2Saved) : null,
        description ?? null,
        img ?? null,
        now(),
        req.params.id
    );
    db.prepare(`INSERT INTO admin_log (admin_id, action, target, details, created_at)
                VALUES (?, 'product.update', ?, ?, ?)`)
      .run(req.user.id, req.params.id, JSON.stringify(req.body || {}), now());
    res.json({ ok: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
    const r = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (r.changes === 0) return res.status(404).json({ error: 'Prodotto non trovato' });
    db.prepare(`INSERT INTO admin_log (admin_id, action, target, created_at)
                VALUES (?, 'product.delete', ?, ?)`)
      .run(req.user.id, req.params.id, now());
    res.json({ ok: true });
});

module.exports = router;
