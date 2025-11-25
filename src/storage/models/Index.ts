// Index model

import db from '../database.js';
import {
  Index,
  IndexStatus,
  AssetAllocation,
  CurrentAllocation,
  RebalancingConfig,
  RiskConfig,
} from '../../types/index.js';
import { IndexRow } from '../../types/database.js';
import { generateId } from '../../utils/crypto.js';

/**
 * Convert database row to Index object
 */
function rowToIndex(row: IndexRow): Index {
  return {
    indexId: row.index_id,
    accountId: row.account_id,
    name: row.name,
    description: row.description || undefined,
    status: row.status as IndexStatus,
    targetAllocation: JSON.parse(row.target_allocation) as AssetAllocation[],
    currentAllocation: row.current_allocation ? JSON.parse(row.current_allocation) as CurrentAllocation[] : null,
    totalValue: row.total_value,
    totalDrift: row.total_drift,
    rebalancingConfig: JSON.parse(row.rebalancing_config) as RebalancingConfig,
    riskConfig: JSON.parse(row.risk_config) as RiskConfig,
    lastRebalance: row.last_rebalance || null,
    nextRebalanceCheck: row.next_rebalance_check || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a new index
 */
export function createIndex(
  accountId: string,
  name: string,
  description: string | undefined,
  targetAllocation: AssetAllocation[],
  rebalancingConfig: RebalancingConfig,
  riskConfig: RiskConfig
): Index {
  const indexId = generateId('idx');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO indices (
      index_id, account_id, name, description, target_allocation,
      rebalancing_config, risk_config, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    indexId,
    accountId,
    name,
    description || null,
    JSON.stringify(targetAllocation),
    JSON.stringify(rebalancingConfig),
    JSON.stringify(riskConfig),
    now,
    now
  );

  return {
    indexId,
    accountId,
    name,
    description,
    status: 'pending_funding',
    targetAllocation,
    currentAllocation: null,
    totalValue: 0,
    totalDrift: 0,
    rebalancingConfig,
    riskConfig,
    lastRebalance: null,
    nextRebalanceCheck: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Find index by ID
 */
export function findIndexById(indexId: string): Index | null {
  const stmt = db.prepare('SELECT * FROM indices WHERE index_id = ?');
  const row = stmt.get(indexId) as IndexRow | undefined;
  return row ? rowToIndex(row) : null;
}

/**
 * List indices
 */
export function listIndices(
  filters: {
    accountId?: string;
    status?: IndexStatus;
  },
  page: number = 1,
  limit: number = 20
): { indices: Index[]; total: number } {
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: any[] = [];

  if (filters.accountId) {
    conditions.push('account_id = ?');
    values.push(filters.accountId);
  }

  if (filters.status) {
    conditions.push('status = ?');
    values.push(filters.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM indices ${whereClause}`);
  const { count } = countStmt.get(...values) as { count: number };

  const stmt = db.prepare(`
    SELECT * FROM indices
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  const rows = stmt.all(...values, limit, offset) as IndexRow[];

  return {
    indices: rows.map(rowToIndex),
    total: count,
  };
}

/**
 * Update index
 */
export function updateIndex(
  indexId: string,
  updates: Partial<{
    name: string;
    description: string;
    status: IndexStatus;
    targetAllocation: AssetAllocation[];
    currentAllocation: CurrentAllocation[];
    totalValue: number;
    totalDrift: number;
    rebalancingConfig: RebalancingConfig;
    riskConfig: RiskConfig;
    lastRebalance: string;
    nextRebalanceCheck: string;
  }>
): Index | null {
  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [new Date().toISOString()];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  if (updates.targetAllocation !== undefined) {
    fields.push('target_allocation = ?');
    values.push(JSON.stringify(updates.targetAllocation));
  }

  if (updates.currentAllocation !== undefined) {
    fields.push('current_allocation = ?');
    values.push(JSON.stringify(updates.currentAllocation));
  }

  if (updates.totalValue !== undefined) {
    fields.push('total_value = ?');
    values.push(updates.totalValue);
  }

  if (updates.totalDrift !== undefined) {
    fields.push('total_drift = ?');
    values.push(updates.totalDrift);
  }

  if (updates.rebalancingConfig !== undefined) {
    fields.push('rebalancing_config = ?');
    values.push(JSON.stringify(updates.rebalancingConfig));
  }

  if (updates.riskConfig !== undefined) {
    fields.push('risk_config = ?');
    values.push(JSON.stringify(updates.riskConfig));
  }

  if (updates.lastRebalance !== undefined) {
    fields.push('last_rebalance = ?');
    values.push(updates.lastRebalance);
  }

  if (updates.nextRebalanceCheck !== undefined) {
    fields.push('next_rebalance_check = ?');
    values.push(updates.nextRebalanceCheck);
  }

  values.push(indexId);

  const stmt = db.prepare(`
    UPDATE indices
    SET ${fields.join(', ')}
    WHERE index_id = ?
  `);

  stmt.run(...values);

  return findIndexById(indexId);
}

/**
 * Delete index
 */
export function deleteIndex(indexId: string): boolean {
  const stmt = db.prepare('DELETE FROM indices WHERE index_id = ?');
  const result = stmt.run(indexId);
  return result.changes > 0;
}

/**
 * Check if account owns index
 */
export function accountOwnsIndex(accountId: string, indexId: string): boolean {
  const stmt = db.prepare('SELECT account_id FROM indices WHERE index_id = ?');
  const row = stmt.get(indexId) as { account_id: string } | undefined;
  return row?.account_id === accountId;
}

/**
 * Get active indices (for scheduler)
 */
export function getActiveIndices(): Index[] {
  const stmt = db.prepare('SELECT * FROM indices WHERE status = ?');
  const rows = stmt.all('active') as IndexRow[];
  return rows.map(rowToIndex);
}

/**
 * Get indices that need rebalancing check
 */
export function getIndicesNeedingRebalanceCheck(): Index[] {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    SELECT * FROM indices
    WHERE status = 'active'
    AND (next_rebalance_check IS NULL OR next_rebalance_check <= ?)
  `);
  const rows = stmt.all(now) as IndexRow[];
  return rows.map(rowToIndex);
}

