const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'eco.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        username      TEXT UNIQUE NOT NULL,
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'user',
        eco_points    INTEGER NOT NULL DEFAULT 0,
        avatar        TEXT,
        bio           TEXT,
        created_at    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);

    CREATE TABLE IF NOT EXISTS products (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        category    TEXT NOT NULL,
        price       REAL NOT NULL CHECK (price >= 0),
        stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        eco_score   INTEGER NOT NULL DEFAULT 5 CHECK (eco_score BETWEEN 1 AND 10),
        co2_saved   REAL NOT NULL DEFAULT 0,
        description TEXT,
        img         TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_price    ON products(price);

    CREATE TABLE IF NOT EXISTS reviews (
        id         TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        user_id    TEXT NOT NULL,
        rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title      TEXT,
        content    TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(product_id, user_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

    CREATE TABLE IF NOT EXISTS cart_items (
        user_id    TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity   INTEGER NOT NULL CHECK (quantity > 0),
        added_at   TEXT NOT NULL,
        PRIMARY KEY (user_id, product_id),
        FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlist (
        user_id    TEXT NOT NULL,
        product_id TEXT NOT NULL,
        added_at   TEXT NOT NULL,
        PRIMARY KEY (user_id, product_id),
        FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coupons (
        code         TEXT PRIMARY KEY,
        description  TEXT,
        discount_pct INTEGER CHECK (discount_pct BETWEEN 0 AND 100),
        min_total    REAL DEFAULT 0,
        valid_until  TEXT,
        max_uses     INTEGER DEFAULT 0,
        used_count   INTEGER NOT NULL DEFAULT 0,
        active       INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
        id              TEXT PRIMARY KEY,
        user_id         TEXT NOT NULL,
        total           REAL NOT NULL,
        discount        REAL NOT NULL DEFAULT 0,
        coupon_code     TEXT,
        status          TEXT NOT NULL DEFAULT 'confirmed',
        ship_street     TEXT NOT NULL,
        ship_city       TEXT NOT NULL,
        ship_zip        TEXT NOT NULL,
        co2_saved_total REAL NOT NULL DEFAULT 0,
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

    CREATE TABLE IF NOT EXISTS order_items (
        order_id   TEXT NOT NULL,
        product_id TEXT NOT NULL,
        name       TEXT NOT NULL,
        price      REAL NOT NULL,
        quantity   INTEGER NOT NULL,
        PRIMARY KEY (order_id, product_id),
        FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS posts (
        id         TEXT PRIMARY KEY,
        title      TEXT NOT NULL,
        content    TEXT NOT NULL,
        tags       TEXT,
        author_id  TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_posts_date   ON posts(created_at);

    CREATE TABLE IF NOT EXISTS post_likes (
        post_id  TEXT NOT NULL,
        user_id  TEXT NOT NULL,
        liked_at TEXT NOT NULL,
        PRIMARY KEY (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
        id         TEXT PRIMARY KEY,
        post_id    TEXT NOT NULL,
        author_id  TEXT NOT NULL,
        content    TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (post_id)   REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

    CREATE TABLE IF NOT EXISTS newsletter (
        email      TEXT PRIMARY KEY,
        subscribed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id   TEXT,
        action     TEXT NOT NULL,
        target     TEXT,
        details    TEXT,
        created_at TEXT NOT NULL
    );
`);

module.exports = db;
