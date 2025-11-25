// Trade model

import db from '../database.js';
import { Trade, TradeType, TradeAction, TradeStatus } from '../../types/index.js';
import { TradeRow } from '../../types/database.js';
import { generateId } from '../../utils/crypto.js';

function rowToTrade(row: TradeRow): Trade {
  return {
    tradeId: row.trade_id,
    indexId: row.index_id,
    rebalanceId: row.rebalance_id || undefined,
    type: row.type as TradeType,
    action: row.action as TradeAction,
    fromAsset: row.from_asset,
    toAsset: row.to_asset,
    amount: row.amount,
    executedPrice: row.executed_price || undefined,
    status: row.status as TradeStatus,
    nearDepositAddress: row.near_deposit_address || undefined,
    nearTxHash: row.near_tx_hash || undefined,
    retryAttempt: row.retry_attempt,
    error: row.error || undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
  };
}

export function createTrade(
  indexId: string,
  type: TradeType,
  action: TradeAction,
  fromAsset: string,
  toAsset: string,
  amount: number,
  rebalanceId?: string
): Trade {
  const tradeId = generateId('trd');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO trades (trade_id, index_id, rebalance_id, type, action, from_asset, to_asset, amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(tradeId, indexId, rebalanceId || null, type, action, fromAsset, toAsset, amount, now);

  return {
    tradeId,
    indexId,
    rebalanceId,
    type,
    action,
    fromAsset,
    toAsset,
    amount,
    status: 'pending',
    retryAttempt: 0,
    createdAt: now,
  };
}

export function findTradeById(tradeId: string): Trade | null {
  const stmt = db.prepare('SELECT * FROM trades WHERE trade_id = ?');
  const row = stmt.get(tradeId) as TradeRow | undefined;
  return row ? rowToTrade(row) : null;
}

export function listTradesByIndexId(
  indexId: string,
  page: number = 1,
  limit: number = 20
): { trades: Trade[]; total: number } {
  const offset = (page - 1) * limit;

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM trades WHERE index_id = ?');
  const { count } = countStmt.get(indexId) as { count: number };

  const stmt = db.prepare(`
    SELECT * FROM trades WHERE index_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
  `);
  const rows = stmt.all(indexId, limit, offset) as TradeRow[];

  return { trades: rows.map(rowToTrade), total: count };
}

export function listTradesByRebalanceId(rebalanceId: string): Trade[] {
  const stmt = db.prepare('SELECT * FROM trades WHERE rebalance_id = ? ORDER BY created_at ASC');
  const rows = stmt.all(rebalanceId) as TradeRow[];
  return rows.map(rowToTrade);
}

export function updateTrade(
  tradeId: string,
  updates: Partial<{
    status: TradeStatus;
    executedPrice: number;
    nearDepositAddress: string;
    nearTxHash: string;
    retryAttempt: number;
    error: string;
    completedAt: string;
  }>
): Trade | null {
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      fields.push(`${snakeKey} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return findTradeById(tradeId);

  values.push(tradeId);
  const stmt = db.prepare(`UPDATE trades SET ${fields.join(', ')} WHERE trade_id = ?`);
  stmt.run(...values);

  return findTradeById(tradeId);
}

export function getPendingTrades(): Trade[] {
  const stmt = db.prepare("SELECT * FROM trades WHERE status IN ('pending', 'executing') ORDER BY created_at ASC");
  const rows = stmt.all() as TradeRow[];
  return rows.map(rowToTrade);
}

