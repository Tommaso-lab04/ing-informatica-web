const db = require('../db');

function loadUser(req, res, next) {
    const userId = req.session?.userId;
    if (userId) {
        const u = db.prepare(
            `SELECT id, username, email, role, eco_points, avatar, bio, created_at
             FROM users WHERE id = ?`
        ).get(userId);
        if (u) req.user = u;
    }
    next();
}

function requireAuth(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Non autenticato' });
    next();
}

function requireAdmin(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Non autenticato' });
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accesso riservato agli amministratori' });
    }
    next();
}

module.exports = { loadUser, requireAuth, requireAdmin };
