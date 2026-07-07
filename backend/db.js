const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'ytdlnis.db');
const db = new Database(dbPath);

// Initialize schema
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    url TEXT,
    title TEXT,
    author TEXT,
    thumb TEXT,
    duration TEXT,
    type TEXT,
    format TEXT,
    completedAt INTEGER,
    downloadPath TEXT,
    filename TEXT,
    filesize INTEGER,
    website TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT,
    template TEXT,
    createdAt INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

module.exports = db;
