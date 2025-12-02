import { findIndexById, updateIndex } from '../storage/models/Index.js';
import { findAccountById } from '../storage/models/Account.js';
import { createRebalance, updateRebalance } from '../storage/models/Rebalance.js';
import { portfolioService } from './PortfolioService.js';
import { driftCalculator } from './DriftCalculator.js';
import { priceService } from './PriceService.js';
import { decryptPrivateKey } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { Index, IndexStatus, AssetAllocation } from '../types/index.js';

/**
 * Service for managing index lifecycle and operations
 */
export class IndexService {
  /**
   * Execute initial portfolio construction
   * @param indexId - Index ID
   * @param totalUsdcAmount - Optional: Total USDC amount to allocate (if not provided, defaults to 100)
   * @returns Success status
   */
  async constructInitialPortfolio(
    indexId: string,
    totalUsdcAmount?: number,
    baseAssetId?: string
  ): Promise<boolean> {
    logger.info('Starting initial portfolio construction', { indexId, totalUsdcAmount, baseAssetId });

    const index = findIndexById(indexId);
    if (!index) {
      throw new Error('Index not found');
    }

    // Allow construction from PENDING or pending_funding status
    // Also allow if ACTIVE (for re-construction after deposits)
    const allowedStatuses = ['PENDING', 'pending_funding', 'ACTIVE'];
    if (!allowedStatuses.includes(index.status)) {
      throw new Error(`Cannot construct portfolio: index status is ${index.status}`);
    }

    // Get account and wallet info
    const account = findAccountById(index.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // If totalUsdcAmount or baseAssetId provided, caller has already verified balance
    // Otherwise we trust the caller (MCP) to have checked
    logger.info('Construction parameters', {
      indexId,
      walletAddress: account.walletAddress,
      providedAmount: totalUsdcAmount,
      baseAssetId
    });

    // Get target allocation (already parsed from DB)
    const targetAllocation: AssetAllocation[] = index.targetAllocation;
    
    // Calculate how much USDC to allocate to each asset
    const usdcAmount = totalUsdcAmount || 100; // Use provided amount or default to 100

    logger.info('Target allocation', {
      indexId,
      totalUsdcAmount: usdcAmount,
      allocations: targetAllocation,
    });

    // Create rebalance record
    const rebalance = createRebalance(
      indexId,
      'initial_construction',
      0,
      targetAllocation.length - 1 // Number of trades (excluding USDC)
    );

    try {
      // Execute portfolio construction
      const trades = await portfolioService.constructPortfolio(
        indexId,
        account.walletAddress,
        targetAllocation,
        usdcAmount,
        rebalance.rebalanceId,
        baseAssetId
      );

      // Update rebalance record
      updateRebalance(rebalance.rebalanceId, {
        status: 'COMPLETED',
        completedTradesCount: trades.filter((t) => t.status === 'COMPLETED').length,
        completedAt: new Date().toISOString(),
      });

      // Update index status
      updateIndex(indexId, {
        status: 'ACTIVE' as IndexStatus,
        totalValue: usdcAmount,
        lastRebalance: new Date().toISOString(),
      });

      logger.info('Initial portfolio construction completed', {
        indexId,
        tradesExecuted: trades.length,
      });

      return true;
    } catch (error) {
      logger.error('Initial portfolio construction failed', { indexId, error });

      // Update rebalance record
      updateRebalance(rebalance.rebalanceId, {
        status: 'FAILED',
        completedAt: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Execute manual rebalancing
   * @param indexId - Index ID
   * @returns Success status
   */
  async executeRebalancing(indexId: string): Promise<boolean> {
    logger.info('Starting manual rebalancing', { indexId });

    const index = findIndexById(indexId);
    if (!index) {
      throw new Error('Index not found');
    }

    if (index.status !== 'ACTIVE') {
      throw new Error(`Cannot rebalance: index status is ${index.status}`);
    }

    // Get account info
    const account = findAccountById(index.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Get current holdings
    // TODO: Implement actual INTENTS balance fetching
    // For now, we'll simulate holdings based on target allocation
    const currentHoldings = await this.getCurrentHoldings(indexId);

    // Get target allocation (already parsed from DB)
    const targetAllocation: AssetAllocation[] = index.targetAllocation;

    // Calculate drift
    const driftAnalysis = await driftCalculator.calculateDrift(
      currentHoldings,
      targetAllocation
    );

    logger.info('Drift analysis', {
      indexId,
      maxDrift: driftAnalysis.maxDrift,
      totalValue: driftAnalysis.totalValue,
      actionsNeeded: driftAnalysis.rebalancingActions.length,
    });

    // Get rebalancing config (already parsed from DB)
    const rebalancingConfig = index.rebalancingConfig;
    const driftThreshold = rebalancingConfig.driftThreshold || 5;

    // Check if rebalancing is needed
    if (!driftCalculator.needsRebalancing(driftAnalysis, driftThreshold)) {
      logger.info('Rebalancing not needed', {
        indexId,
        maxDrift: driftAnalysis.maxDrift,
        threshold: driftThreshold,
      });
      return false;
    }

    // Create rebalance record
    const rebalance = createRebalance(
      indexId,
      'manual_trigger',
      driftAnalysis.maxDrift,
      driftAnalysis.rebalancingActions.length
    );

    try {
      // Execute rebalancing
      const trades = await portfolioService.executeRebalancing(
        indexId,
        account.walletAddress,
        driftAnalysis.rebalancingActions,
        rebalance.rebalanceId
      );

      // Update rebalance record
      updateRebalance(rebalance.rebalanceId, {
        status: 'COMPLETED',
        completedTradesCount: trades.filter((t) => t.status === 'COMPLETED').length,
        completedAt: new Date().toISOString(),
      });

      // Update index
      updateIndex(indexId, {
        totalDrift: 0, // Reset drift after successful rebalancing
        lastRebalance: new Date().toISOString(),
      });

      logger.info('Rebalancing completed', {
        indexId,
        tradesExecuted: trades.length,
      });

      return true;
    } catch (error) {
      logger.error('Rebalancing failed', { indexId, error });

      // Update rebalance record
      updateRebalance(rebalance.rebalanceId, {
        status: 'FAILED',
        completedAt: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Get current holdings for an index
   * @param indexId - Index ID
   * @returns Map of symbol to amount
   */
  private async getCurrentHoldings(indexId: string): Promise<Map<string, number>> {
    // TODO: Implement actual INTENTS balance fetching
    // For now, return simulated holdings that have drifted from target

    const index = findIndexById(indexId);
    if (!index) {
      throw new Error('Index not found');
    }

    const targetAllocation: AssetAllocation[] = index.targetAllocation;
    const totalValue = index.totalValue || 100;

    // Simulate drift: BTC and ETH have gained, SOL has lost
    const holdings = new Map<string, number>();

    for (const alloc of targetAllocation) {
      const targetUsdValue = (alloc.percentage / 100) * totalValue;
      const price = await priceService.getPrice(alloc.symbol);

      if (price === 0) {
        logger.warn(`Price not available for ${alloc.symbol}, skipping`);
        continue;
      }

      // Simulate some drift
      let driftFactor = 1.0;
      if (alloc.symbol === 'BTC') driftFactor = 1.1; // +10%
      if (alloc.symbol === 'ETH') driftFactor = 1.08; // +8%
      if (alloc.symbol === 'SOL') driftFactor = 0.9; // -10%

      const currentUsdValue = targetUsdValue * driftFactor;
      const amount = currentUsdValue / price;

      holdings.set(alloc.symbol, amount);
    }

    return holdings;
  }

  /**
   * Calculate current drift for an index
   * @param indexId - Index ID
   * @returns Drift analysis
   */
  async calculateCurrentDrift(indexId: string) {
    const index = findIndexById(indexId);
    if (!index) {
      throw new Error('Index not found');
    }

    const currentHoldings = await this.getCurrentHoldings(indexId);
    const targetAllocation = index.targetAllocation;

    const driftAnalysis = await driftCalculator.calculateDrift(
      currentHoldings,
      targetAllocation
    );

    // Update index with current drift
    updateIndex(indexId, {
      totalDrift: driftAnalysis.maxDrift,
      totalValue: driftAnalysis.totalValue,
    });

    return driftAnalysis;
  }
}

// Singleton instance
export const indexService = new IndexService();

