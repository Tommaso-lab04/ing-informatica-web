const crypto = require('crypto');
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const { loadUser } = require('./middleware/auth');

const PORT = process.env.PORT || 3000;

// NOTA: In produzione la variabile viene caricata da ambiente (.env)
const SESSION_SECRET = process.env.SESSION_SECRET || 'stringa_segreta_di_fallback';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));
app.use(cookieParser(SESSION_SECRET));

app.use(session({
    secret: SESSION_SECRET,
    name: 'eco.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

app.use(loadUser);

app.use('/api/auth/login', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Troppi tentativi, riprova tra qualche minuto' }
}));
app.use('/api/auth/register', rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'Troppe registrazioni da questo IP' }
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/community', require('./routes/community'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/admin', require('./routes/admin'));

app.use('/', require('./routes/xml'));

app.use(express.static(path.join(__dirname, '..', 'public'), {
    extensions: ['html'],
    setHeaders(res, filePath) {
        if (filePath.endsWith('.xsl')) res.type('text/xsl');
    }
}));

app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint non trovato' });
    }
    res.status(404).sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Errore non gestito:', err);
    res.status(500).json({ error: 'Errore interno del server' });
});

app.listen(PORT, () => {
    console.log(`Eco-Nomico server avviato su http://localhost:${PORT}`);
});

module.exports = app;
