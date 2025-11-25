// Webhook model

import db from '../database.js';
import { Webhook } from '../../types/index.js';
import { WebhookRow } from '../../types/database.js';
import { generateId } from '../../utils/crypto.js';

function rowToWebhook(row: WebhookRow): Webhook {
  return {
    webhookId: row.webhook_id,
    userId: row.user_id,
    url: row.url,
    events: JSON.parse(row.events) as string[],
    secret: row.secret,
    active: row.active === 1,
    createdAt: row.created_at,
  };
}

export function createWebhook(
  userId: string,
  url: string,
  events: string[],
  secret: string
): Webhook {
  const webhookId = generateId('whk');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO webhooks (webhook_id, user_id, url, events, secret, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(webhookId, userId, url, JSON.stringify(events), secret, now);

  return {
    webhookId,
    userId,
    url,
    events,
    secret,
    active: true,
    createdAt: now,
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
  updates: Partial<{ url: string; events: string[]; active: boolean }>
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

  if (updates.active !== undefined) {
    fields.push('active = ?');
    values.push(updates.active ? 1 : 0);
  }

  if (fields.length === 0) return findWebhookById(webhookId);

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

