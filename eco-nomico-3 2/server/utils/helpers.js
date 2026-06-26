const crypto = require('crypto');

function newId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function now() {
    return new Date().toISOString();
}

function escapeXml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function isValidEmail(s) {
    return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function parseTags(s) {
    if (!s) return [];
    if (Array.isArray(s)) return s.map(t => String(t).trim()).filter(Boolean).slice(0, 5);
    return String(s).split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
}

function money(n) {
    return Math.round(Number(n) * 100) / 100;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

module.exports = { newId, now, escapeXml, isValidEmail, parseTags, money, sleep };
