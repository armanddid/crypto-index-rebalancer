// User model

import db from '../database.js';
import { User } from '../../types/index.js';
import { UserRow } from '../../types/database.js';
import { generateId } from '../../utils/crypto.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Convert database row to User object
 */
function rowToUser(row: UserRow): User {
  return {
    userId: row.user_id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    createdAt: row.created_at,
  };
}

/**
 * Create a new user
 */
export async function createUser(email: string, password: string, name: string): Promise<User> {
  const userId = generateId('usr');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const stmt = db.prepare(`
    INSERT INTO users (user_id, email, password_hash, name)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(userId, email, passwordHash, name);

  return {
    userId,
    email,
    passwordHash,
    name,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Find user by ID
 */
export function findUserById(userId: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE user_id = ?');
  const row = stmt.get(userId) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

/**
 * Find user by email
 */
export function findUserByEmail(email: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const row = stmt.get(email) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

/**
 * Verify user password
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/**
 * Update user
 */
export function updateUser(userId: string, updates: Partial<Pick<User, 'name' | 'email'>>): User | null {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }

  if (fields.length === 0) {
    return findUserById(userId);
  }

  values.push(userId);

  const stmt = db.prepare(`
    UPDATE users
    SET ${fields.join(', ')}
    WHERE user_id = ?
  `);

  stmt.run(...values);

  return findUserById(userId);
}

/**
 * Delete user
 */
export function deleteUser(userId: string): boolean {
  const stmt = db.prepare('DELETE FROM users WHERE user_id = ?');
  const result = stmt.run(userId);
  return result.changes > 0;
}

/**
 * List all users (admin function)
 */
export function listUsers(page: number = 1, limit: number = 20): { users: User[]; total: number } {
  const offset = (page - 1) * limit;

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const { count } = countStmt.get() as { count: number };

  const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?');
  const rows = stmt.all(limit, offset) as UserRow[];

  return {
    users: rows.map(rowToUser),
    total: count,
  };
}

