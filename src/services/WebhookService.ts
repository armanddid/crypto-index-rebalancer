/**
 * Webhook Service
 * 
 * Sends notifications to external systems via webhooks
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger.js';
import { listWebhooksByUserId, getActiveWebhooksForEvent, updateWebhook } from '../storage/models/Webhook.js';

export type WebhookEvent =
  | 'index.created'
  | 'index.updated'
  | 'index.deleted'
  | 'index.paused'
  | 'index.resumed'
  | 'rebalance.started'
  | 'rebalance.completed'
  | 'rebalance.failed'
  | 'trade.executed'
  | 'trade.failed'
  | 'drift.detected'
  | 'drift.threshold_exceeded';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  userId: string;
  data: any;
}

export class WebhookService {
  private readonly TIMEOUT_MS = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;

  /**
   * Send webhook notification
   */
  async sendWebhook(userId: string, event: WebhookEvent, data: any): Promise<void> {
    logger.info('Sending webhook notification', { userId, event });

    // Find all webhooks for this user and event
    const webhooks = getActiveWebhooksForEvent(userId, event);

    if (webhooks.length === 0) {
      logger.debug('No webhooks registered for event', { userId, event });
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      userId,
      data,
    };

    // Send to all registered webhooks
    const promises = webhooks.map(webhook =>
      this.sendToWebhook(webhook.webhookId, webhook.url, payload)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Send to a specific webhook URL
   */
  private async sendToWebhook(
    webhookId: string,
    url: string,
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<void> {
    try {
      logger.debug('Sending webhook', { webhookId, url, attempt });

      const response = await axios.post(url, payload, {
        timeout: this.TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CryptoIndexRebalancer/1.0',
          'X-Webhook-Event': payload.event,
          'X-Webhook-Timestamp': payload.timestamp,
        },
      });

      logger.info('Webhook sent successfully', {
        webhookId,
        url,
        status: response.status,
        attempt,
      });

      // Update last success timestamp
      updateWebhook(webhookId, {
        lastTriggeredAt: new Date().toISOString(),
        failureCount: 0,
      });

    } catch (error: any) {
      const isAxiosError = error instanceof AxiosError;
      const status = isAxiosError ? error.response?.status : undefined;
      const errorMessage = isAxiosError ? error.message : String(error);

      logger.error('Webhook failed', {
        webhookId,
        url,
        attempt,
        status,
        error: errorMessage,
      });

      // Update failure count
      const webhook = listWebhooksByUserId(payload.userId).find(w => w.webhookId === webhookId);
      if (webhook) {
        const newFailureCount = (webhook.failureCount || 0) + 1;
        updateWebhook(webhookId, {
          lastTriggeredAt: new Date().toISOString(),
          failureCount: newFailureCount,
        });

        // Disable webhook if too many failures
        if (newFailureCount >= 10) {
          logger.warn('Disabling webhook due to repeated failures', {
            webhookId,
            url,
            failureCount: newFailureCount,
          });
          updateWebhook(webhookId, { enabled: false });
        }
      }

      // Retry if not too many attempts
      if (attempt < this.MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.info(`Retrying webhook in ${delay}ms`, { webhookId, attempt: attempt + 1 });
        await new Promise(resolve => setTimeout(resolve, delay));
        await this.sendToWebhook(webhookId, url, payload, attempt + 1);
      }
    }
  }

  /**
   * Test a webhook URL
   */
  async testWebhook(url: string): Promise<{ success: boolean; status?: number; error?: string }> {
    try {
      const testPayload: WebhookPayload = {
        event: 'index.created',
        timestamp: new Date().toISOString(),
        userId: 'test',
        data: {
          message: 'This is a test webhook',
          indexId: 'test_index',
        },
      };

      const response = await axios.post(url, testPayload, {
        timeout: this.TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CryptoIndexRebalancer/1.0',
          'X-Webhook-Event': 'test',
        },
      });

      return {
        success: true,
        status: response.status,
      };
    } catch (error: any) {
      const isAxiosError = error instanceof AxiosError;
      return {
        success: false,
        status: isAxiosError ? error.response?.status : undefined,
        error: isAxiosError ? error.message : String(error),
      };
    }
  }
}

export const webhookService = new WebhookService();

