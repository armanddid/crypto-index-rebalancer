import { nearIntentsClient } from '../integrations/nearIntents.js';
import { executeIntentsSwap } from '../integrations/intentsSwapExecutor.js';
import { QuoteRequest, QuoteResponse, SwapStatusResponse } from '../integrations/nearIntentsTypes.js';
import { Trade, TradeStatus } from '../types/index.js';
import { RebalancingAction } from './DriftCalculator.js';
import { priceService } from './PriceService.js';
import { findAccountById } from '../storage/models/Account.js';
import { decryptPrivateKey } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { createTrade, updateTrade } from '../storage/models/Trade.js';

/**
 * Service for executing portfolio construction and rebalancing trades
 */
export class PortfolioService {
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY_MS = 5000; // 5 seconds
  private readonly POLL_INTERVAL_MS = 10000; // 10 seconds
  private readonly MAX_POLL_TIME_MS = 600000; // 10 minutes

  /**
   * Execute initial portfolio construction
   * @param accountId - Account ID (INTENTS account)
   * @param walletAddress - EVM wallet address
   * @param allocations - Target allocations { symbol: percentage }
   * @param totalUsdcAmount - Total USDC available
   * @param rebalanceId - Rebalance ID for tracking
   * @param baseAssetId - Optional: Specific USDC asset ID to use (e.g., Base USDC, Ethereum USDC)
   * @returns Array of executed trades
   */
  async constructPortfolio(
    indexId: string,
    walletAddress: string,
    allocations: Array<{ symbol: string; percentage: number }>,
    totalUsdcAmount: number,
    rebalanceId: string,
    baseAssetId?: string
  ): Promise<Trade[]> {
    logger.info('Starting portfolio construction', {
      indexId,
      allocations: allocations.length,
      totalUsdcAmount,
      baseAssetId: baseAssetId || 'default',
    });

    // Use only 99% of balance to leave buffer for transfer fees
    const USABLE_BALANCE_PERCENTAGE = 0.99;
    const usableAmount = totalUsdcAmount * USABLE_BALANCE_PERCENTAGE;
    const reservedAmount = totalUsdcAmount - usableAmount;

    logger.info('Applying balance buffer for fees', {
      totalUsdcAmount,
      usableAmount,
      reservedAmount,
      bufferPercentage: ((1 - USABLE_BALANCE_PERCENTAGE) * 100).toFixed(2) + '%',
      baseAssetId: baseAssetId || 'default',
    });

    const trades: Trade[] = [];

    // Execute trades sequentially to avoid race conditions
    for (const allocation of allocations) {
      // Skip USDC (it's already in the account)
      if (allocation.symbol === 'USDC') {
        logger.info('Skipping USDC trade (already in account)');
        continue;
      }

      // Use usableAmount instead of totalUsdcAmount for calculations
      const usdcAmount = (allocation.percentage / 100) * usableAmount;
      
      logger.info(`Buying ${allocation.symbol} with ${usdcAmount} USDC (${allocation.percentage}%)`);

      try {
        const trade = await this.executeBuyTrade(
          indexId,
          walletAddress,
          'USDC',
          allocation.symbol,
          usdcAmount,
          rebalanceId,
          baseAssetId
        );

        trades.push(trade);
        logger.info(`Successfully bought ${allocation.symbol}`, { tradeId: trade.tradeId });
      } catch (error) {
        logger.error(`Failed to buy ${allocation.symbol}`, { error });
        throw error; // Stop construction if any trade fails
      }
    }

    logger.info(`Portfolio construction complete: ${trades.length} trades executed`);
    return trades;
  }

  /**
   * Execute rebalancing trades
   * @param accountId - Account ID
   * @param walletAddress - EVM wallet address
   * @param actions - Rebalancing actions to execute
   * @param rebalanceId - Rebalance ID for tracking
   * @returns Array of executed trades
   */
  async executeRebalancing(
    indexId: string,
    walletAddress: string,
    actions: RebalancingAction[],
    rebalanceId: string
  ): Promise<Trade[]> {
    logger.info('Starting rebalancing', {
      indexId,
      actions: actions.length,
    });

    const trades: Trade[] = [];

    // Step 1: Execute all SELL actions first (to free up capital)
    const sellActions = actions.filter((a) => a.action === 'SELL');
    for (const action of sellActions) {
      try {
        const trade = await this.executeSellTrade(
          indexId,
          walletAddress,
          action.symbol,
          'USDC',
          action.amountDelta,
          rebalanceId
        );
        trades.push(trade);
        logger.info(`Successfully sold ${action.symbol}`, { tradeId: trade.tradeId });
      } catch (error) {
        logger.error(`Failed to sell ${action.symbol}`, { error });
        // Continue with other trades even if one fails
      }
    }

    // Step 2: Execute all BUY actions
    const buyActions = actions.filter((a) => a.action === 'BUY');
    for (const action of buyActions) {
      try {
        // Calculate USDC amount needed
        const usdcAmount = await priceService.calculateUsdValue(action.symbol, action.amountDelta);
        
        const trade = await this.executeBuyTrade(
          indexId,
          walletAddress,
          'USDC',
          action.symbol,
          usdcAmount,
          rebalanceId
        );
        trades.push(trade);
        logger.info(`Successfully bought ${action.symbol}`, { tradeId: trade.tradeId });
      } catch (error) {
        logger.error(`Failed to buy ${action.symbol}`, { error });
        // Continue with other trades even if one fails
      }
    }

    logger.info(`Rebalancing complete: ${trades.length} trades executed`);
    return trades;
  }

  /**
   * Execute a buy trade (USDC → Asset in INTENTS)
   * @param accountId - Account ID
   * @param walletAddress - EVM wallet address
   * @param fromSymbol - Source asset symbol (usually USDC)
   * @param toSymbol - Destination asset symbol
   * @param fromAmount - Amount to swap (in source asset)
   * @param rebalanceId - Rebalance ID for tracking
   * @param baseAssetId - Optional: Specific USDC asset ID to use
   * @returns Executed trade
   */
  private async executeBuyTrade(
    indexId: string,
    walletAddress: string,
    fromSymbol: string,
    toSymbol: string,
    fromAmount: number,
    rebalanceId: string,
    baseAssetId?: string
  ): Promise<Trade> {
    return this.executeTradeWithRetry(
      indexId,
      walletAddress,
      fromSymbol,
      toSymbol,
      fromAmount,
      rebalanceId,
      'BUY',
      baseAssetId
    );
  }

  /**
   * Execute a sell trade (Asset → USDC in INTENTS)
   * @param accountId - Account ID
   * @param walletAddress - EVM wallet address
   * @param fromSymbol - Source asset symbol
   * @param toSymbol - Destination asset symbol (usually USDC)
   * @param fromAmount - Amount to swap (in source asset)
   * @param rebalanceId - Rebalance ID for tracking
   * @returns Executed trade
   */
  private async executeSellTrade(
    indexId: string,
    walletAddress: string,
    fromSymbol: string,
    toSymbol: string,
    fromAmount: number,
    rebalanceId: string
  ): Promise<Trade> {
    return this.executeTradeWithRetry(
      indexId,
      walletAddress,
      fromSymbol,
      toSymbol,
      fromAmount,
      rebalanceId,
      'SELL'
    );
  }

  /**
   * Execute a trade with retry logic
   * @param accountId - Account ID
   * @param walletAddress - EVM wallet address
   * @param fromSymbol - Source asset symbol
   * @param toSymbol - Destination asset symbol
   * @param fromAmount - Amount to swap
   * @param rebalanceId - Rebalance ID
   * @param tradeType - Trade type (BUY or SELL)
   * @param baseAssetId - Optional: Specific USDC asset ID to use
   * @returns Executed trade
   */
  private async executeTradeWithRetry(
    indexId: string,
    walletAddress: string,
    fromSymbol: string,
    toSymbol: string,
    fromAmount: number,
    rebalanceId: string,
    tradeType: 'BUY' | 'SELL',
    baseAssetId?: string
  ): Promise<Trade> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`Retry attempt ${attempt} for ${fromSymbol} → ${toSymbol}`);
          await this.delay(this.RETRY_DELAY_MS * attempt); // Exponential backoff
        }

        return await this.executeTrade(
          indexId,
          walletAddress,
          fromSymbol,
          toSymbol,
          fromAmount,
          rebalanceId,
          tradeType,
          baseAssetId
        );
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Trade attempt ${attempt + 1} failed`, {
          fromSymbol,
          toSymbol,
          error: lastError.message,
        });
      }
    }

    // All retries failed
    throw new Error(
      `Trade failed after ${this.MAX_RETRIES + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Execute a single trade (INTENTS → INTENTS)
   * @param accountId - Account ID
   * @param walletAddress - EVM wallet address
   * @param fromSymbol - Source asset symbol
   * @param toSymbol - Destination asset symbol
   * @param fromAmount - Amount to swap
   * @param rebalanceId - Rebalance ID
   * @param tradeType - Trade type
   * @param baseAssetId - Optional: Specific USDC asset ID to use
   * @returns Executed trade
   */
  private async executeTrade(
    indexId: string,
    walletAddress: string,
    fromSymbol: string,
    toSymbol: string,
    fromAmount: number,
    rebalanceId: string,
    tradeType: 'BUY' | 'SELL',
    baseAssetId?: string
  ): Promise<Trade> {
    logger.info(`Executing ${tradeType}: ${fromAmount} ${fromSymbol} → ${toSymbol}`, {
      baseAssetId: baseAssetId || 'default',
    });

    // Get the index to find the account
    const { findIndexById } = await import('../storage/models/Index.js');
    const index = findIndexById(indexId);
    if (!index) {
      throw new Error('Index not found');
    }

    // Get account and decrypt private key
    const account = findAccountById(index.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const privateKey = decryptPrivateKey(account.encryptedPrivateKey);
    logger.debug('Private key decrypted for trade execution');

    // 1. Find tokens
    // If baseAssetId is provided and fromSymbol is USDC, use it directly
    let fromToken;
    if (baseAssetId && fromSymbol === 'USDC') {
      logger.info('Using custom base asset ID for USDC', { baseAssetId });
      fromToken = {
        assetId: baseAssetId,
        symbol: 'USDC',
        decimals: 6, // USDC always has 6 decimals
      };
    } else {
      // For INTENTS swaps, find any token with the symbol (no blockchain filter)
      // since INTENTS supports cross-chain swaps
      fromToken = await nearIntentsClient.findTokenBySymbol(fromSymbol);
    }
    // Don't filter by blockchain - INTENTS can swap to any supported chain
    const toToken = await nearIntentsClient.findTokenBySymbol(toSymbol);

    logger.debug('Found tokens', {
      fromSymbol,
      toSymbol,
      fromToken: fromToken ? { symbol: fromToken.symbol, assetId: fromToken.assetId } : null,
      toToken: toToken ? { symbol: toToken.symbol, assetId: toToken.assetId } : null,
    });

    if (!fromToken || !toToken) {
      throw new Error(`Token not found: ${fromSymbol} or ${toSymbol}`);
    }

    if (!fromToken.assetId || !toToken.assetId) {
      throw new Error(`Token missing assetId: ${fromSymbol} (${fromToken.assetId}) or ${toSymbol} (${toToken.assetId})`);
    }

    // 2. Convert amount to smallest unit
    const amountInSmallestUnit = Math.floor(fromAmount * Math.pow(10, fromToken.decimals));

    // 3. Execute INTENTS-to-INTENTS swap using SDK + 1-Click API
    logger.info('Executing INTENTS-to-INTENTS swap', {
      from: fromSymbol,
      to: toSymbol,
      amount: fromAmount,
      wallet: walletAddress,
    });

    const swapResult = await executeIntentsSwap({
      evmPrivateKey: privateKey,
      evmAddress: walletAddress.toLowerCase(),
      fromAssetId: fromToken.assetId,
      toAssetId: toToken.assetId,
      amount: amountInSmallestUnit.toString(),
      recipientAddress: walletAddress.toLowerCase(), // For INTENTS-to-INTENTS, recipient is same as sender
    });

    // 4. Create trade record
    const trade = createTrade(
      indexId,
      tradeType,
      tradeType,
      fromSymbol,
      toSymbol,
      fromAmount,
      rebalanceId
    );

    logger.info(`Trade executed via 1-Click SDK`, {
      tradeId: trade.tradeId,
      depositAddress: swapResult.depositAddress,
      depositTxHash: swapResult.depositTxHash,
      status: swapResult.status,
    });

    // 5. Update trade with results
    updateTrade(trade.tradeId, {
      nearTxHash: swapResult.depositTxHash,
      nearDepositAddress: swapResult.depositAddress,
      status: swapResult.status === 'SUCCESS' ? 'COMPLETED' as TradeStatus : 'PENDING' as TradeStatus,
    });

    trade.status = swapResult.status === 'SUCCESS' ? 'COMPLETED' as TradeStatus : 'PENDING' as TradeStatus;

    if (swapResult.status !== 'SUCCESS') {
      throw new Error(`Trade not successful: ${swapResult.status}`);
    }

    logger.info(`Trade completed successfully`, { 
      tradeId: trade.tradeId,
      depositAddress: swapResult.depositAddress,
      destinationTxHash: swapResult.destinationTxHash,
    });

    return trade;
  }

  /**
   * Monitor swap status until completion
   * @param depositAddress - Deposit address to monitor
   * @param tradeId - Trade ID for logging
   * @returns Final swap status
   */
  private async monitorSwapStatus(
    depositAddress: string,
    tradeId: string
  ): Promise<SwapStatusResponse> {
    logger.info(`Monitoring swap status for trade ${tradeId}...`);

    const startTime = Date.now();
    let pollCount = 0;

    while (Date.now() - startTime < this.MAX_POLL_TIME_MS) {
      pollCount++;
      const status = await nearIntentsClient.getSwapStatus(depositAddress);

      logger.debug(`Poll #${pollCount}: ${status.status}`, { tradeId });

      if (status.status === 'SUCCESS') {
        logger.info(`Swap completed in ${Math.floor((Date.now() - startTime) / 1000)}s`, {
          tradeId,
        });
        return status;
      }

      if (['REFUNDED', 'FAILED'].includes(status.status)) {
        logger.error(`Swap ${status.status}`, { tradeId, status });
        return status;
      }

      // Wait before next poll
      await this.delay(this.POLL_INTERVAL_MS);
    }

    throw new Error(`Swap monitoring timeout after ${this.MAX_POLL_TIME_MS / 1000}s`);
  }

  /**
   * Utility: Delay execution
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const portfolioService = new PortfolioService();

