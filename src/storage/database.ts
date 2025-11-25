// SQLite database wrapper using better-sqlite3

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/index-rebalancer.db');

// Ensure data directory exists
const dataDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
export const db: Database.Database = new Database(DATABASE_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? logger.debug.bind(logger) : undefined,
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

logger.info(`Database initialized at ${DATABASE_PATH}`);

// Initialize database schema
export function initializeDatabase() {
  logger.info('Initializing database schema...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      account_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      wallet_address TEXT UNIQUE NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      deposit_addresses TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // Indices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS indices (
      index_id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending_funding',
      target_allocation TEXT NOT NULL,
      current_allocation TEXT,
      total_value REAL NOT NULL DEFAULT 0,
      total_drift REAL NOT NULL DEFAULT 0,
      rebalancing_config TEXT NOT NULL,
      risk_config TEXT NOT NULL,
      last_rebalance TEXT,
      next_rebalance_check TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
    )
  `);

  // Trades table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      trade_id TEXT PRIMARY KEY,
      index_id TEXT NOT NULL,
      rebalance_id TEXT,
      type TEXT NOT NULL,
      action TEXT NOT NULL,
      from_asset TEXT NOT NULL,
      to_asset TEXT NOT NULL,
      amount REAL NOT NULL,
      executed_price REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      near_deposit_address TEXT,
      near_tx_hash TEXT,
      retry_attempt INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (index_id) REFERENCES indices(index_id) ON DELETE CASCADE,
      FOREIGN KEY (rebalance_id) REFERENCES rebalances(rebalance_id) ON DELETE SET NULL
    )
  `);

  // Rebalances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rebalances (
      rebalance_id TEXT PRIMARY KEY,
      index_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      total_drift REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      trades_count INTEGER NOT NULL DEFAULT 0,
      completed_trades_count INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      duration INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (index_id) REFERENCES indices(index_id) ON DELETE CASCADE
    )
  `);

  // Webhooks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      webhook_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT NOT NULL,
      secret TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // Refresh tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      token_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  // Price history table (for caching)
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      price REAL NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create indices for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_indices_account_id ON indices(account_id);
    CREATE INDEX IF NOT EXISTS idx_indices_status ON indices(status);
    CREATE INDEX IF NOT EXISTS idx_trades_index_id ON trades(index_id);
    CREATE INDEX IF NOT EXISTS idx_trades_rebalance_id ON trades(rebalance_id);
    CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
    CREATE INDEX IF NOT EXISTS idx_rebalances_index_id ON rebalances(index_id);
    CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_symbol_timestamp ON price_history(symbol, timestamp);
  `);

  logger.info('Database schema initialized successfully');
}

// Close database connection
export function closeDatabase() {
  db.close();
  logger.info('Database connection closed');
}

// Export database instance
export default db;

