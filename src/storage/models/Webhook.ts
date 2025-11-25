// Webhook model

import db from '../database.js';
import { Webhook } from '../../types/index.js';
import { WebhookRow } from '../../types/database.js';
import { generateId } from '../../utils/crypto.js';

function rowToWebhook(row: any): Webhook {
  return {
    webhookId: row.webhook_id,
    userId: row.user_id,
    url: row.url,
    events: JSON.parse(row.events) as string[],
    description: row.description || undefined,
    secret: row.secret,
    active: row.active === 1,
    failureCount: row.failure_count || 0,
    lastTriggeredAt: row.last_triggered_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export function createWebhook(
  userId: string,
  url: string,
  events: string[],
  description?: string,
  active: boolean = true
): Webhook {
  const webhookId = generateId('whk');
  const now = new Date().toISOString();
  const secret = generateId('whk_secret'); // Generate a secret for webhook verification

  const stmt = db.prepare(`
    INSERT INTO webhooks (webhook_id, user_id, url, events, description, secret, active, failure_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(webhookId, userId, url, JSON.stringify(events), description || null, secret, active ? 1 : 0, 0, now, now);

  return {
    webhookId,
    userId,
    url,
    events,
    description,
    secret,
    active,
    failureCount: 0,
    lastTriggeredAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function findWebhookById(webhookId: string): Webhook | null {
  const stmt = db.prepare('SELECT * FROM webhooks WHERE webhook_id = ?');
  const row = stmt.get(webhookId) as WebhookRow | undefined;
  return row ? rowToWebhook(row) : null;
}

export function listWebhooksByUserId(userId: string): Webhook[] {
  const stmt = db.prepare('SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC');
  const rows = stmt.all(userId) as WebhookRow[];
  return rows.map(rowToWebhook);
}

export function getActiveWebhooksForEvent(userId: string, event: string): Webhook[] {
  const stmt = db.prepare('SELECT * FROM webhooks WHERE user_id = ? AND active = 1');
  const rows = stmt.all(userId) as WebhookRow[];
  return rows
    .map(rowToWebhook)
    .filter(webhook => webhook.events.includes(event));
}

export function updateWebhook(
  webhookId: string,
  updates: Partial<{
    url: string;
    events: string[];
    description: string;
    enabled: boolean;
    failureCount: number;
    lastTriggeredAt: string;
  }>
): Webhook | null {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.url !== undefined) {
    fields.push('url = ?');
    values.push(updates.url);
  }

  if (updates.events !== undefined) {
    fields.push('events = ?');
    values.push(JSON.stringify(updates.events));
  }

  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }

  if (updates.enabled !== undefined) {
    fields.push('active = ?');
    values.push(updates.enabled ? 1 : 0);
  }

  if (updates.failureCount !== undefined) {
    fields.push('failure_count = ?');
    values.push(updates.failureCount);
  }

  if (updates.lastTriggeredAt !== undefined) {
    fields.push('last_triggered_at = ?');
    values.push(updates.lastTriggeredAt);
  }

  if (fields.length === 0) return findWebhookById(webhookId);

  // Always update updated_at
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(webhookId);
  const stmt = db.prepare(`UPDATE webhooks SET ${fields.join(', ')} WHERE webhook_id = ?`);
  stmt.run(...values);

  return findWebhookById(webhookId);
}

export function deleteWebhook(webhookId: string): boolean {
  const stmt = db.prepare('DELETE FROM webhooks WHERE webhook_id = ?');
  const result = stmt.run(webhookId);
  return result.changes > 0;
}

