const express = require('express');
const router = express.Router();
const db = require('../db');
const { newId, now, parseTags } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

function mapPost(row, currentUserId) {
    const tags = row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const likeCount = db.prepare('SELECT COUNT(*) AS c FROM post_likes WHERE post_id = ?').get(row.id).c;
    const commentCount = db.prepare('SELECT COUNT(*) AS c FROM comments WHERE post_id = ?').get(row.id).c;
    const likedByMe = currentUserId
        ? !!db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(row.id, currentUserId)
        : false;
    return {
        id: row.id,
        title: row.title,
        content: row.content,
        tags,
        authorId: row.author_id,
        authorName: row.authorName,
        createdAt: row.created_at,
        likeCount,
        commentCount,
        likedByMe
    };
}

router.get('/posts', (req, res) => {
    const { sort = 'recent', q, tag } = req.query;
    let sql = `
        SELECT p.*, u.username AS authorName
        FROM posts p
        JOIN users u ON u.id = p.author_id
        WHERE 1=1
    `;
    const params = [];
    if (q) {
        sql += ' AND (LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ?)';
        const like = `%${String(q).toLowerCase()}%`;
        params.push(like, like);
    }
    if (tag) {
        sql += ' AND p.tags LIKE ?';
        params.push(`%${tag}%`);
    }

    const rows = db.prepare(sql).all(...params);
    let posts = rows.map(r => mapPost(r, req.user?.id));
    if (sort === 'popular') posts.sort((a, b) => b.likeCount - a.likeCount);
    else posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(posts);
});

router.get('/posts/:id', (req, res) => {
    const row = db.prepare(`
        SELECT p.*, u.username AS authorName
        FROM posts p
        JOIN users u ON u.id = p.author_id
        WHERE p.id = ?
    `).get(req.params.id);

    if (!row) return res.status(404).json({ error: 'Post non trovato' });

    const post = mapPost(row, req.user?.id);
    post.comments = db.prepare(`
        SELECT c.id, c.author_id AS authorId, u.username AS authorName,
               c.content, c.created_at AS createdAt
        FROM comments c JOIN users u ON u.id = c.author_id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(post);
});

router.post('/posts', requireAuth, (req, res) => {
    const { title, content, tags } = req.body || {};
    if (!title || !content) return res.status(400).json({ error: 'Titolo e contenuto obbligatori' });
    if (title.length < 5 || title.length > 120) return res.status(400).json({ error: 'Titolo tra 5 e 120 caratteri' });
    if (content.length < 20 || content.length > 5000) return res.status(400).json({ error: 'Contenuto tra 20 e 5000 caratteri' });

    const id = newId('p');
    const t = now();
    db.prepare(`
        INSERT INTO posts (id, title, content, tags, author_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title.slice(0, 120), content.slice(0, 5000),
           parseTags(tags).join(','), req.user.id, t);

    db.prepare('UPDATE users SET eco_points = eco_points + 10 WHERE id = ?').run(req.user.id);

    const row = db.prepare(`
        SELECT p.*, u.username AS authorName
        FROM posts p JOIN users u ON u.id = p.author_id
        WHERE p.id = ?
    `).get(id);
    res.status(201).json(mapPost(row, req.user.id));
});

router.delete('/posts/:id', requireAuth, (req, res) => {
    const p = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ error: 'Post non trovato' });
    if (p.author_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Non autorizzato' });
    }
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

router.post('/posts/:id/like', requireAuth, (req, res) => {
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post non trovato' });

    const existing = db.prepare(
        'SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (existing) {
        db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?')
          .run(req.params.id, req.user.id);
    } else {
        db.prepare('INSERT INTO post_likes (post_id, user_id, liked_at) VALUES (?, ?, ?)')
          .run(req.params.id, req.user.id, now());
    }

    const c = db.prepare('SELECT COUNT(*) AS c FROM post_likes WHERE post_id = ?').get(req.params.id).c;
    res.json({ likeCount: c, likedByMe: !existing });
});

router.post('/posts/:id/comments', requireAuth, (req, res) => {
    const { content } = req.body || {};
    if (!content || content.length < 3) return res.status(400).json({ error: 'Commento troppo corto' });

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post non trovato' });

    const id = newId('c');
    const t = now();
    db.prepare(`
        INSERT INTO comments (id, post_id, author_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(id, req.params.id, req.user.id, String(content).slice(0, 1000), t);

    res.status(201).json({
        id,
        authorId: req.user.id,
        authorName: req.user.username,
        content: String(content).slice(0, 1000),
        createdAt: t
    });
});

router.get('/tags', (req, res) => {
    const rows = db.prepare('SELECT tags FROM posts WHERE tags IS NOT NULL AND tags != ""').all();
    const map = new Map();
    for (const r of rows) {
        for (const t of r.tags.split(',').map(s => s.trim()).filter(Boolean)) {
            map.set(t, (map.get(t) || 0) + 1);
        }
    }
    const list = [...map.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
    res.json(list);
});

module.exports = router;
