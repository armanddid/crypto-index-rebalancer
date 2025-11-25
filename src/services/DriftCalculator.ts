import { AssetAllocation } from '../types/index.js';
import { priceService } from './PriceService.js';
import { logger } from '../utils/logger.js';

export interface CurrentAllocation {
  symbol: string;
  amount: number;
  usdValue: number;
  currentPercentage: number;
  targetPercentage: number;
  drift: number; // Absolute drift in percentage points
  driftPercentage: number; // Relative drift as percentage of target
}

export interface DriftAnalysis {
  totalValue: number;
  allocations: CurrentAllocation[];
  maxDrift: number;
  needsRebalancing: boolean;
  rebalancingActions: RebalancingAction[];
}

export interface RebalancingAction {
  symbol: string;
  action: 'BUY' | 'SELL';
  currentAmount: number;
  targetAmount: number;
  amountDelta: number;
  usdValue: number;
}

/**
 * Service for calculating portfolio drift and rebalancing needs
 */
export class DriftCalculator {
  /**
   * Calculate current allocations and drift from target
   * @param holdings - Current token holdings { symbol: amount }
   * @param targetAllocations - Target allocations with percentages
   * @returns Drift analysis
   */
  async calculateDrift(
    holdings: Map<string, number>,
    targetAllocations: AssetAllocation[]
  ): Promise<DriftAnalysis> {
    logger.info('Calculating portfolio drift...', {
      holdingsCount: holdings.size,
      targetCount: targetAllocations.length,
    });

    // 1. Fetch current prices for all assets
    const symbols = [...holdings.keys()];
    const prices = await priceService.getPrices(symbols);

    // 2. Calculate current USD values
    let totalValue = 0;
    const currentValues = new Map<string, number>();

    for (const [symbol, amount] of holdings.entries()) {
      const price = prices.get(symbol) || 0;
      const usdValue = amount * price;
      currentValues.set(symbol, usdValue);
      totalValue += usdValue;
    }

    logger.info(`Total portfolio value: $${totalValue.toFixed(2)}`);

    // 3. Calculate current percentages and drift
    const allocations: CurrentAllocation[] = [];

    for (const target of targetAllocations) {
      const amount = holdings.get(target.symbol) || 0;
      const usdValue = currentValues.get(target.symbol) || 0;
      const currentPercentage = totalValue > 0 ? (usdValue / totalValue) * 100 : 0;
      const drift = Math.abs(currentPercentage - target.percentage);
      const driftPercentage = target.percentage > 0 ? (drift / target.percentage) * 100 : 0;

      allocations.push({
        symbol: target.symbol,
        amount,
        usdValue,
        currentPercentage,
        targetPercentage: target.percentage,
        drift,
        driftPercentage,
      });

      logger.debug(`${target.symbol}: ${currentPercentage.toFixed(2)}% (target: ${target.percentage}%, drift: ${drift.toFixed(2)}pp)`);
    }

    // 4. Find max drift
    const maxDrift = Math.max(...allocations.map((a) => a.drift));

    // 5. Generate rebalancing actions
    const rebalancingActions = await this.generateRebalancingActions(
      allocations,
      totalValue,
      prices
    );

    const analysis: DriftAnalysis = {
      totalValue,
      allocations,
      maxDrift,
      needsRebalancing: false, // Will be determined by caller based on threshold
      rebalancingActions,
    };

    logger.info(`Max drift: ${maxDrift.toFixed(2)}pp, Actions needed: ${rebalancingActions.length}`);
    return analysis;
  }

  /**
   * Generate rebalancing actions to bring portfolio back to target
   * @param allocations - Current allocations with drift
   * @param totalValue - Total portfolio value in USD
   * @param prices - Current token prices
   * @returns Array of rebalancing actions
   */
  private async generateRebalancingActions(
    allocations: CurrentAllocation[],
    totalValue: number,
    prices: Map<string, number>
  ): Promise<RebalancingAction[]> {
    const actions: RebalancingAction[] = [];

    for (const allocation of allocations) {
      const targetUsdValue = (allocation.targetPercentage / 100) * totalValue;
      const currentUsdValue = allocation.usdValue;
      const usdDelta = targetUsdValue - currentUsdValue;

      // Skip if already at target (within 1% tolerance)
      if (Math.abs(usdDelta) < totalValue * 0.01) {
        continue;
      }

      const price = prices.get(allocation.symbol) || 0;
      if (price === 0) {
        logger.warn(`Cannot calculate rebalancing action for ${allocation.symbol}: price is 0`);
        continue;
      }

      const targetAmount = targetUsdValue / price;
      const amountDelta = targetAmount - allocation.amount;

      actions.push({
        symbol: allocation.symbol,
        action: usdDelta > 0 ? 'BUY' : 'SELL',
        currentAmount: allocation.amount,
        targetAmount,
        amountDelta: Math.abs(amountDelta),
        usdValue: Math.abs(usdDelta),
      });
    }

    // Sort by USD value (largest first)
    actions.sort((a, b) => b.usdValue - a.usdValue);

    return actions;
  }

  /**
   * Check if rebalancing is needed based on drift threshold
   * @param driftAnalysis - Drift analysis result
   * @param driftThresholdPercent - Drift threshold in percentage points
   * @returns True if rebalancing is needed
   */
  needsRebalancing(driftAnalysis: DriftAnalysis, driftThresholdPercent: number): boolean {
    const needs = driftAnalysis.maxDrift >= driftThresholdPercent;
    
    logger.info(`Rebalancing check: maxDrift=${driftAnalysis.maxDrift.toFixed(2)}pp, threshold=${driftThresholdPercent}pp, needed=${needs}`);
    
    return needs;
  }

  /**
   * Calculate expected portfolio value after rebalancing
   * @param driftAnalysis - Drift analysis result
   * @returns Expected value (should be same as current, minus fees)
   */
  calculateExpectedValueAfterRebalancing(driftAnalysis: DriftAnalysis): number {
    // In INTENTS, rebalancing doesn't change total value (ignoring minimal fees)
    // This is mainly for validation
    return driftAnalysis.totalValue;
  }
}

// Singleton instance
export const driftCalculator = new DriftCalculator();

