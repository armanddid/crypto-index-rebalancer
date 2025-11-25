// Rebalance model

import db from '../database.js';
import { Rebalance, RebalanceStatus } from '../../types/index.js';
import { RebalanceRow } from '../../types/database.js';
import { generateId } from '../../utils/crypto.js';

function rowToRebalance(row: RebalanceRow): Rebalance {
  return {
    rebalanceId: row.rebalance_id,
    indexId: row.index_id,
    reason: row.reason,
    totalDrift: row.total_drift,
    status: row.status as RebalanceStatus,
    tradesCount: row.trades_count,
    completedTradesCount: row.completed_trades_count,
    cost: row.cost,
    duration: row.duration || undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
  };
}

export function createRebalance(
  indexId: string,
  reason: string,
  totalDrift: number,
  tradesCount: number
): Rebalance {
  const rebalanceId = generateId('reb');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO rebalances (rebalance_id, index_id, reason, total_drift, trades_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(rebalanceId, indexId, reason, totalDrift, tradesCount, now);

  return {
    rebalanceId,
    indexId,
    reason,
    totalDrift,
    status: 'PENDING',
    tradesCount,
    completedTradesCount: 0,
    cost: 0,
    createdAt: now,
  };
}

export function findRebalanceById(rebalanceId: string): Rebalance | null {
  const stmt = db.prepare('SELECT * FROM rebalances WHERE rebalance_id = ?');
  const row = stmt.get(rebalanceId) as RebalanceRow | undefined;
  return row ? rowToRebalance(row) : null;
}

export function listRebalancesByIndexId(
  indexId: string,
  page: number = 1,
  limit: number = 20
): { rebalances: Rebalance[]; total: number } {
  const offset = (page - 1) * limit;

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM rebalances WHERE index_id = ?');
  const { count } = countStmt.get(indexId) as { count: number };

  const stmt = db.prepare(`
    SELECT * FROM rebalances WHERE index_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
  `);
  const rows = stmt.all(indexId, limit, offset) as RebalanceRow[];

  return { rebalances: rows.map(rowToRebalance), total: count };
}

export function updateRebalance(
  rebalanceId: string,
  updates: Partial<{
    status: RebalanceStatus;
    completedTradesCount: number;
    cost: number;
    duration: number;
    completedAt: string;
  }>
): Rebalance | null {
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      fields.push(`${snakeKey} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return findRebalanceById(rebalanceId);

  values.push(rebalanceId);
  const stmt = db.prepare(`UPDATE rebalances SET ${fields.join(', ')} WHERE rebalance_id = ?`);
  stmt.run(...values);

  return findRebalanceById(rebalanceId);
}

