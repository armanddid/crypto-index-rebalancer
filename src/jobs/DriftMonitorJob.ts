/**
 * Drift Monitor Job
 * 
 * Periodically checks all active indexes for drift and triggers rebalancing when needed
 */

import { logger } from '../utils/logger.js';
import { listIndicesByStatus, findIndexById } from '../storage/models/Index.js';
import { findAccountById } from '../storage/models/Account.js';
import { indexService } from '../services/IndexService.js';
import { webhookService } from '../services/WebhookService.js';

export class DriftMonitorJob {
  /**
   * Execute drift monitoring for all active indexes
   */
  async execute(): Promise<void> {
    logger.info('Starting drift monitor job');

    try {
      // Get all active indexes
      const activeIndexes = listIndicesByStatus('ACTIVE');

      if (activeIndexes.length === 0) {
        logger.info('No active indexes to monitor');
        return;
      }

      logger.info(`Monitoring ${activeIndexes.length} active indexes`);

      // Check each index
      const results = await Promise.allSettled(
        activeIndexes.map(async index => {
          // Get userId from account
          const account = findAccountById(index.accountId);
          if (!account) {
            logger.warn('Account not found for index', { indexId: index.indexId });
            return;
          }
          return this.checkIndex(index.indexId, account.userId);
        })
      );

      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info('Drift monitor job completed', {
        total: activeIndexes.length,
        successful,
        failed,
      });

    } catch (error: any) {
      logger.error('Drift monitor job failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Check a single index for drift
   */
  private async checkIndex(indexId: string, userId: string): Promise<void> {
    try {
      logger.debug('Checking index for drift', { indexId });

      // Get index details
      const index = findIndexById(indexId);
      if (!index) {
        logger.warn('Index not found', { indexId });
        return;
      }

      // Skip if rebalancing is disabled
      if (index.rebalancingConfig.method === 'NONE') {
        logger.debug('Rebalancing disabled for index', { indexId });
        return;
      }

      // Check if we should rebalance based on method
      const shouldCheck = this.shouldCheckForRebalancing(index);
      if (!shouldCheck) {
        logger.debug('Not time to check for rebalancing', {
          indexId,
          method: index.rebalancingConfig.method,
          lastRebalance: index.lastRebalance,
        });
        return;
      }

      // Calculate current drift
      const driftAnalysis = await indexService.calculateDrift(indexId);

      logger.info('Drift calculated', {
        indexId,
        maxDrift: driftAnalysis.maxDrift,
        threshold: index.rebalancingConfig.driftThreshold,
        needsRebalancing: driftAnalysis.maxDrift > (index.rebalancingConfig.driftThreshold || 5),
      });

      // Send webhook for drift detection
      if (driftAnalysis.maxDrift > 0) {
        await webhookService.sendWebhook(userId, 'drift.detected', {
          indexId,
          indexName: index.name,
          maxDrift: driftAnalysis.maxDrift,
          threshold: index.rebalancingConfig.driftThreshold,
          totalValue: driftAnalysis.totalValue,
          driftDetails: driftAnalysis.rebalancingActions,
        });
      }

      // Check if drift exceeds threshold
      const threshold = index.rebalancingConfig.driftThreshold || 5;
      if (driftAnalysis.maxDrift > threshold) {
        logger.info('Drift threshold exceeded, triggering rebalancing', {
          indexId,
          maxDrift: driftAnalysis.maxDrift,
          threshold,
        });

        // Send webhook for threshold exceeded
        await webhookService.sendWebhook(userId, 'drift.threshold_exceeded', {
          indexId,
          indexName: index.name,
          maxDrift: driftAnalysis.maxDrift,
          threshold,
          totalValue: driftAnalysis.totalValue,
          actionsNeeded: driftAnalysis.rebalancingActions.length,
        });

        // Trigger rebalancing
        const rebalanced = await indexService.triggerRebalance(indexId);

        if (rebalanced) {
          logger.info('Automatic rebalancing completed', { indexId });
          
          // Send success webhook
          await webhookService.sendWebhook(userId, 'rebalance.completed', {
            indexId,
            indexName: index.name,
            trigger: 'automatic',
            maxDrift: driftAnalysis.maxDrift,
            actionsExecuted: driftAnalysis.rebalancingActions.length,
          });
        } else {
          logger.warn('Rebalancing not needed or failed', { indexId });
        }
      }

    } catch (error: any) {
      logger.error('Failed to check index', {
        indexId,
        error: error.message,
        stack: error.stack,
      });

      // Send failure webhook
      await webhookService.sendWebhook(userId, 'rebalance.failed', {
        indexId,
        error: error.message,
        trigger: 'automatic',
      });

      throw error;
    }
  }

  /**
   * Determine if we should check for rebalancing based on method and last rebalance time
   */
  private shouldCheckForRebalancing(index: any): boolean {
    const method = index.rebalancingConfig.method;

    // Always check for DRIFT method
    if (method === 'DRIFT') {
      return true;
    }

    // For DAILY method, check if 24 hours have passed
    if (method === 'DAILY') {
      if (!index.lastRebalance) {
        return true; // Never rebalanced
      }

      const lastRebalance = new Date(index.lastRebalance);
      const hoursSinceLastRebalance = (Date.now() - lastRebalance.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastRebalance >= 24;
    }

    // For HYBRID method, check daily AND drift
    if (method === 'HYBRID') {
      if (!index.lastRebalance) {
        return true;
      }

      const lastRebalance = new Date(index.lastRebalance);
      const hoursSinceLastRebalance = (Date.now() - lastRebalance.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastRebalance >= 24;
    }

    return false;
  }
}

export const driftMonitorJob = new DriftMonitorJob();

