// Account model

import db from '../database.js';
import { Account, DepositAddresses } from '../../types/index.js';
import { AccountRow } from '../../types/database.js';
import { generateId } from '../../utils/crypto.js';

/**
 * Convert database row to Account object
 */
function rowToAccount(row: AccountRow): Account {
  return {
    accountId: row.account_id,
    userId: row.user_id,
    name: row.name,
    walletAddress: row.wallet_address,
    encryptedPrivateKey: row.encrypted_private_key,
    depositAddresses: JSON.parse(row.deposit_addresses) as DepositAddresses,
    createdAt: row.created_at,
  };
}

/**
 * Create a new account
 */
export function createAccount(
  userId: string,
  name: string,
  walletAddress: string,
  encryptedPrivateKey: string,
  depositAddresses: DepositAddresses
): Account {
  const accountId = generateId('acc');

  const stmt = db.prepare(`
    INSERT INTO accounts (account_id, user_id, name, wallet_address, encrypted_private_key, deposit_addresses)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    accountId,
    userId,
    name,
    walletAddress,
    encryptedPrivateKey,
    JSON.stringify(depositAddresses)
  );

  return {
    accountId,
    userId,
    name,
    walletAddress,
    encryptedPrivateKey,
    depositAddresses,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Find account by ID
 */
export function findAccountById(accountId: string): Account | null {
  const stmt = db.prepare('SELECT * FROM accounts WHERE account_id = ?');
  const row = stmt.get(accountId) as AccountRow | undefined;
  return row ? rowToAccount(row) : null;
}

/**
 * Find account by wallet address
 */
export function findAccountByWalletAddress(walletAddress: string): Account | null {
  const stmt = db.prepare('SELECT * FROM accounts WHERE wallet_address = ?');
  const row = stmt.get(walletAddress) as AccountRow | undefined;
  return row ? rowToAccount(row) : null;
}

/**
 * List accounts for a user
 */
export function listAccountsByUserId(
  userId: string,
  page: number = 1,
  limit: number = 20
): { accounts: Account[]; total: number } {
  const offset = (page - 1) * limit;

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM accounts WHERE user_id = ?');
  const { count } = countStmt.get(userId) as { count: number };

  const stmt = db.prepare(`
    SELECT * FROM accounts
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  const rows = stmt.all(userId, limit, offset) as AccountRow[];

  return {
    accounts: rows.map(rowToAccount),
    total: count,
  };
}

/**
 * Update account
 */
export function updateAccount(
  accountId: string,
  updates: Partial<Pick<Account, 'name' | 'depositAddresses'>>
): Account | null {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (updates.depositAddresses !== undefined) {
    fields.push('deposit_addresses = ?');
    values.push(JSON.stringify(updates.depositAddresses));
  }

  if (fields.length === 0) {
    return findAccountById(accountId);
  }

  values.push(accountId);

  const stmt = db.prepare(`
    UPDATE accounts
    SET ${fields.join(', ')}
    WHERE account_id = ?
  `);

  stmt.run(...values);

  return findAccountById(accountId);
}

/**
 * Delete account
 */
export function deleteAccount(accountId: string): boolean {
  const stmt = db.prepare('DELETE FROM accounts WHERE account_id = ?');
  const result = stmt.run(accountId);
  return result.changes > 0;
}

/**
 * Check if user owns account
 */
export function userOwnsAccount(userId: string, accountId: string): boolean {
  const stmt = db.prepare('SELECT user_id FROM accounts WHERE account_id = ?');
  const row = stmt.get(accountId) as { user_id: string } | undefined;
  return row?.user_id === userId;
}

