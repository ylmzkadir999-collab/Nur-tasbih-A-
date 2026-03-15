const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'nur_tasbih.db');

let db;
try {
  db = new Database(DB_PATH);
} catch (err) {
  console.error(`❌  Cannot open database at "${DB_PATH}":`, err.message);
  process.exit(1);
}

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('cache_size = -8000');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    email                TEXT    UNIQUE NOT NULL,
    password_hash        TEXT    NOT NULL,
    subscription_status  TEXT    NOT NULL DEFAULT 'free',
    subscription_expiry  INTEGER DEFAULT NULL,
    total_count          INTEGER NOT NULL DEFAULT 0,
    streak_days          INTEGER NOT NULL DEFAULT 0,
    last_active_date     TEXT    DEFAULT NULL,
    theme                TEXT    NOT NULL DEFAULT 'black',
    created_at           INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS tasbih_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    dhikr      TEXT    NOT NULL DEFAULT 'SubhanAllah',
    count      INTEGER NOT NULL DEFAULT 0,
    date       TEXT    NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS custom_dhikr (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    arabic          TEXT,
    transliteration TEXT    NOT NULL,
    translation     TEXT,
    target          INTEGER NOT NULL DEFAULT 33,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON tasbih_sessions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_custom_dhikr_user  ON custom_dhikr(user_id);
`);

// Payment intents tablosu
db.prepare(`
  CREATE TABLE IF NOT EXISTS payment_intents (
    conversation_id   TEXT PRIMARY KEY,
    user_id           INTEGER NOT NULL,
    plan              TEXT NOT NULL,
    price             TEXT NOT NULL,
    status            TEXT DEFAULT 'pending',
    iyzico_payment_id TEXT,
    created_at        INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

// Favori ayetler tablosu
db.prepare(`
  CREATE TABLE IF NOT EXISTS favorite_ayahs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    sure_no      INTEGER NOT NULL,
    ayah_no      INTEGER NOT NULL,
    arabic       TEXT    NOT NULL,
    translation  TEXT    NOT NULL,
    source       TEXT    NOT NULL DEFAULT 'yazir',
    sure_name    TEXT,
    note         TEXT,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(user_id, sure_no, ayah_no),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

// Hatim ilerleme tablosu — backend sync
db.prepare(`
  CREATE TABLE IF NOT EXISTS hatim_progress (
    user_id    INTEGER PRIMARY KEY,
    sure_no    INTEGER NOT NULL DEFAULT 1,
    ayah_no    INTEGER NOT NULL DEFAULT 1,
    completed  INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

// Migrations — mevcut DB'ler icin safe ALTER TABLE
const _migrations = [
  { col: 'theme',     sql: "ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'black'" },
  { col: 'full_name', sql: 'ALTER TABLE users ADD COLUMN full_name TEXT DEFAULT NULL' },
];
for (const m of _migrations) {
  try { db.prepare('SELECT ' + m.col + ' FROM users LIMIT 1').get(); }
  catch { db.prepare(m.sql).run(); console.log('Migration: ' + m.col); }
}

module.exports = db;
