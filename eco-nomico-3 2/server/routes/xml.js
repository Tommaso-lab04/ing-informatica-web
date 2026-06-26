const express = require('express');
const router = express.Router();
const db = require('../db');
const { escapeXml } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

router.get('/products.xml', (req, res) => {
    const products = db.prepare(`
        SELECT p.*, COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS review_count
        FROM products p
        LEFT JOIN reviews r ON r.product_id = p.id
        GROUP BY p.id
        ORDER BY p.category, p.name
    `).all();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/xsl/products.xsl"?>
<catalog xmlns:eco="https://eco-nomico.local/ns/catalog" generated="${new Date().toISOString()}">
    <meta>
        <title>Catalogo Eco-Nomico</title>
        <count>${products.length}</count>
    </meta>
    <products>
${products.map(p => `        <product id="${escapeXml(p.id)}">
            <name>${escapeXml(p.name)}</name>
            <category>${escapeXml(p.category)}</category>
            <price currency="EUR">${p.price.toFixed(2)}</price>
            <stock>${p.stock}</stock>
            <eco:score max="10">${p.eco_score}</eco:score>
            <eco:co2-saved unit="kg">${(p.co2_saved || 0).toFixed(2)}</eco:co2-saved>
            <rating average="${Number(p.avg_rating).toFixed(2)}" count="${p.review_count}"/>
            <description>${escapeXml(p.description || '')}</description>
            <image>${escapeXml(p.img || '')}</image>
        </product>`).join('\n')}
    </products>
</catalog>`;

    res.type('application/xml').send(xml);
});

router.get('/orders.xml', requireAuth, (req, res) => {
    const orders = db.prepare(`
        SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);

    const blocks = orders.map(o => {
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
        return `    <order id="${escapeXml(o.id)}" status="${escapeXml(o.status)}">
        <createdAt>${escapeXml(o.created_at)}</createdAt>
        <total currency="EUR">${o.total.toFixed(2)}</total>
        <co2-saved unit="kg">${(o.co2_saved_total || 0).toFixed(2)}</co2-saved>
        <shipping>
            <street>${escapeXml(o.ship_street)}</street>
            <city>${escapeXml(o.ship_city)}</city>
            <zip>${escapeXml(o.ship_zip)}</zip>
        </shipping>
        <items>
${items.map(it => `            <item productId="${escapeXml(it.product_id)}">
                <name>${escapeXml(it.name)}</name>
                <price>${it.price.toFixed(2)}</price>
                <quantity>${it.quantity}</quantity>
            </item>`).join('\n')}
        </items>
    </order>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<orders user="${escapeXml(req.user.username)}" generated="${new Date().toISOString()}">
${blocks.join('\n')}
</orders>`;
    res.type('application/xml').send(xml);
});

router.get('/rss.xml', (req, res) => {
    const posts = db.prepare(`
        SELECT p.*, u.username AS authorName
        FROM posts p JOIN users u ON u.id = p.author_id
        ORDER BY p.created_at DESC
        LIMIT 20
    `).all();

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <channel>
        <title>Eco-Nomico — Community</title>
        <link>${baseUrl}/community.html</link>
        <description>Idee per ridurre, riutilizzare e riciclare</description>
        <language>it-it</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${posts.map(p => `        <item>
            <title>${escapeXml(p.title)}</title>
            <link>${baseUrl}/community.html#${escapeXml(p.id)}</link>
            <guid isPermaLink="false">${escapeXml(p.id)}</guid>
            <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
            <dc:creator>${escapeXml(p.authorName)}</dc:creator>
            <description>${escapeXml(p.content.slice(0, 300))}</description>
        </item>`).join('\n')}
    </channel>
</rss>`;
    res.type('application/rss+xml').send(xml);
});

router.get('/sitemap.xml', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const staticPages = ['', 'shop.html', 'community.html', 'cart.html',
                         'login.html', 'profile.html', 'admin.html', 'xml-feed.html'];

    const products = db.prepare('SELECT id, updated_at FROM products').all();
    const posts = db.prepare('SELECT id, created_at FROM posts').all();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => `    <url>
        <loc>${baseUrl}/${p}</loc>
        <changefreq>weekly</changefreq>
        <priority>${p === '' ? '1.0' : '0.6'}</priority>
    </url>`).join('\n')}
${products.map(p => `    <url>
        <loc>${baseUrl}/shop.html?id=${escapeXml(p.id)}</loc>
        <lastmod>${p.updated_at.split('T')[0]}</lastmod>
        <priority>0.8</priority>
    </url>`).join('\n')}
${posts.map(p => `    <url>
        <loc>${baseUrl}/community.html#${escapeXml(p.id)}</loc>
        <lastmod>${p.created_at.split('T')[0]}</lastmod>
        <priority>0.5</priority>
    </url>`).join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
});

module.exports = router;
