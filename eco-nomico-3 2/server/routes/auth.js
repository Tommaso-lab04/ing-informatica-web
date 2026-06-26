const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { newId, now, isValidEmail } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

function publicUser(u) {
    return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        ecoPoints: u.eco_points,
        avatar: u.avatar || null,
        bio: u.bio || null,
        createdAt: u.created_at
    };
}

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body || {};

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Campi obbligatori mancanti' });
        }
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ error: 'Username tra 3 e 30 caratteri' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Email non valida' });
        }
        if (password.length < 4) {
            return res.status(400).json({ error: 'Password troppo corta (min 4 caratteri)' });
        }

        const existsUsername = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
        if (existsUsername) return res.status(409).json({ error: 'Username già in uso' });
        const existsEmail = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
        if (existsEmail) return res.status(409).json({ error: 'Email già registrata' });

        const password_hash = await bcrypt.hash(password, 10);
        const id = newId('u');
        const created_at = now();

        db.prepare(`
            INSERT INTO users (id, username, email, password_hash, role, eco_points, created_at)
            VALUES (?, ?, ?, ?, 'user', 0, ?)
        `).run(id, username, email.toLowerCase(), password_hash, created_at);

        req.session.userId = id;

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        res.status(201).json(publicUser(user));
    } catch (err) {
        console.error('register error:', err);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ error: 'Campi obbligatori mancanti' });
        }

        const user = db.prepare(`
            SELECT * FROM users WHERE username = ? OR email = ?
        `).get(username, username.toLowerCase());

        if (!user) return res.status(401).json({ error: 'Credenziali non valide' });

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: 'Credenziali non valide' });

        req.session.userId = user.id;
        res.json(publicUser(user));
    } catch (err) {
        console.error('login error:', err);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Errore logout' });
        res.clearCookie('eco.sid');
        res.json({ ok: true });
    });
});

router.get('/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Non autenticato' });
    res.json(publicUser(req.user));
});

router.patch('/me', requireAuth, (req, res) => {
    const { avatar, bio } = req.body || {};
    db.prepare(`UPDATE users SET avatar = COALESCE(?, avatar), bio = COALESCE(?, bio) WHERE id = ?`)
      .run(
          avatar !== undefined ? String(avatar).slice(0, 10) : null,
          bio !== undefined ? String(bio).slice(0, 500) : null,
          req.user.id
      );
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json(publicUser(u));
});

router.post('/change-password', requireAuth, async (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Campi mancanti' });
    if (newPassword.length < 4) return res.status(400).json({ error: 'Nuova password troppo corta' });

    const u = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const ok = await bcrypt.compare(oldPassword, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Vecchia password errata' });

    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ ok: true });
});

module.exports = router;
