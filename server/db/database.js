const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'quick_lube.db');
let currentDb = null;

function connect(filePath = dbPath) {
  if (currentDb) {
    try {
      if (currentDb.open) {
        currentDb.pragma('wal_checkpoint(TRUNCATE)');
        currentDb.close();
      }
    } catch (e) {
      console.warn('[DB] Warning closing current DB instance:', e.message);
    }
  }

  currentDb = new Database(filePath);
  currentDb.pragma('foreign_keys = ON');
  currentDb.pragma('journal_mode = WAL');
  currentDb.pragma('synchronous = NORMAL');
  console.log(`[DB] Connected successfully to: ${filePath}`);
  return currentDb;
}

// Initial connection
connect();

// Proxy delegate pattern to support seamless hot-swapping during backup restoration
const proxy = new Proxy({}, {
  get(target, prop) {
    if (prop === 'reconnect') {
      return connect;
    }
    if (prop === 'getDbPath') {
      return () => dbPath;
    }
    if (prop === 'isDatabaseOpen') {
      return () => currentDb && currentDb.open;
    }
    const val = currentDb[prop];
    if (typeof val === 'function') {
      return val.bind(currentDb);
    }
    return val;
  },
  set(target, prop, value) {
    currentDb[prop] = value;
    return true;
  }
});

module.exports = proxy;
