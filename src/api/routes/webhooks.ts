/**
 * Webhook Management API Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import {
  createWebhook,
  findWebhookById,
  listWebhooksByUserId,
  updateWebhook,
  deleteWebhook,
} from '../../storage/models/Webhook.js';
import { webhookService } from '../../services/WebhookService.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/errors.js';

const router = Router();

// Validation schemas
const createWebhookSchema = z.object({
  url: z.string().url('Invalid URL'),
  events: z.array(z.enum([
    'index.created',
    'index.updated',
    'index.deleted',
    'index.paused',
    'index.resumed',
    'rebalance.started',
    'rebalance.completed',
    'rebalance.failed',
    'trade.executed',
    'trade.failed',
    'drift.detected',
    'drift.threshold_exceeded',
  ])).min(1, 'At least one event is required'),
  description: z.string().optional(),
  enabled: z.boolean().optional().default(true),
});

const updateWebhookSchema = z.object({
  url: z.string().url('Invalid URL').optional(),
  events: z.array(z.string()).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const validated = createWebhookSchema.parse(req.body);

    logger.info('Creating webhook', { userId, url: validated.url });

    // Test webhook URL before creating
    const testResult = await webhookService.testWebhook(validated.url);
    if (!testResult.success) {
      throw new AppError(
        `Webhook URL test failed: ${testResult.error}`,
        'WEBHOOK_TEST_FAILED',
        400
      );
    }

    const webhook = createWebhook(
      userId,
      validated.url,
      validated.events,
      validated.description,
      validated.enabled
    );

    res.status(201).json({
      success: true,
      webhook: {
        webhookId: webhook.webhookId,
        url: webhook.url,
        events: webhook.events,
        description: webhook.description,
        enabled: webhook.enabled,
        createdAt: webhook.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/webhooks
 * List all webhooks for the authenticated user
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    logger.info('Listing webhooks', { userId });

    const webhooks = listWebhooksByUserId(userId);

    res.json({
      success: true,
      webhooks: webhooks.map(w => ({
        webhookId: w.webhookId,
        url: w.url,
        events: w.events,
        description: w.description,
        enabled: w.enabled,
        failureCount: w.failureCount,
        lastTriggeredAt: w.lastTriggeredAt,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
      count: webhooks.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/webhooks/:webhookId
 * Get webhook details
 */
router.get('/:webhookId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { webhookId } = req.params;

    logger.info('Getting webhook', { userId, webhookId });

    const webhook = findWebhookById(webhookId);
    if (!webhook) {
      throw new AppError('Webhook not found', 'WEBHOOK_NOT_FOUND', 404);
    }

    // Verify ownership
    if (webhook.userId !== userId) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
    }

    res.json({
      success: true,
      webhook: {
        webhookId: webhook.webhookId,
        url: webhook.url,
        events: webhook.events,
        description: webhook.description,
        enabled: webhook.enabled,
        failureCount: webhook.failureCount,
        lastTriggeredAt: webhook.lastTriggeredAt,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/webhooks/:webhookId
 * Update webhook
 */
router.put('/:webhookId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { webhookId } = req.params;
    const validated = updateWebhookSchema.parse(req.body);

    logger.info('Updating webhook', { userId, webhookId });

    const webhook = findWebhookById(webhookId);
    if (!webhook) {
      throw new AppError('Webhook not found', 'WEBHOOK_NOT_FOUND', 404);
    }

    // Verify ownership
    if (webhook.userId !== userId) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
    }

    // Test new URL if provided
    if (validated.url) {
      const testResult = await webhookService.testWebhook(validated.url);
      if (!testResult.success) {
        throw new AppError(
          `Webhook URL test failed: ${testResult.error}`,
          'WEBHOOK_TEST_FAILED',
          400
        );
      }
    }

    const updated = updateWebhook(webhookId, validated);

    res.json({
      success: true,
      webhook: {
        webhookId: updated!.webhookId,
        url: updated!.url,
        events: updated!.events,
        description: updated!.description,
        enabled: updated!.enabled,
        failureCount: updated!.failureCount,
        lastTriggeredAt: updated!.lastTriggeredAt,
        updatedAt: updated!.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/webhooks/:webhookId
 * Delete webhook
 */
router.delete('/:webhookId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { webhookId } = req.params;

    logger.info('Deleting webhook', { userId, webhookId });

    const webhook = findWebhookById(webhookId);
    if (!webhook) {
      throw new AppError('Webhook not found', 'WEBHOOK_NOT_FOUND', 404);
    }

    // Verify ownership
    if (webhook.userId !== userId) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
    }

    const deleted = deleteWebhook(webhookId);
    if (!deleted) {
      throw new AppError('Failed to delete webhook', 'DELETE_FAILED', 500);
    }

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/webhooks/:webhookId/test
 * Test webhook
 */
router.post('/:webhookId/test', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { webhookId } = req.params;

    logger.info('Testing webhook', { userId, webhookId });

    const webhook = findWebhookById(webhookId);
    if (!webhook) {
      throw new AppError('Webhook not found', 'WEBHOOK_NOT_FOUND', 404);
    }

    // Verify ownership
    if (webhook.userId !== userId) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
    }

    const testResult = await webhookService.testWebhook(webhook.url);

    res.json({
      success: testResult.success,
      status: testResult.status,
      error: testResult.error,
      message: testResult.success
        ? 'Webhook test successful'
        : 'Webhook test failed',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

