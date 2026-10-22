const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'quick_lube.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for optimal POS performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

module.exports = db;
