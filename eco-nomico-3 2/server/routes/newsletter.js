const express = require('express');
const router = express.Router();
const db = require('../db');
const { now, isValidEmail } = require('../utils/helpers');
const { requireAdmin } = require('../middleware/auth');

router.post('/subscribe', (req, res) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Email non valida' });

    try {
        db.prepare('INSERT INTO newsletter (email, subscribed_at) VALUES (?, ?)')
          .run(email, now());
        res.status(201).json({ ok: true, message: 'Iscrizione completata' });
    } catch (e) {
        if (String(e.message).includes('UNIQUE')) {
            return res.status(200).json({ ok: true, message: 'Sei già iscritto' });
        }
        throw e;
    }
});

router.post('/unsubscribe', (req, res) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    db.prepare('DELETE FROM newsletter WHERE email = ?').run(email);
    res.json({ ok: true });
});

router.get('/list', requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT * FROM newsletter ORDER BY subscribed_at DESC').all());
});

module.exports = router;
