import { nearIntentsClient } from '../integrations/nearIntents.js';
import { SupportedToken } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Service for fetching and managing asset prices
 */
export class PriceService {
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache

  /**
   * Get current price for an asset symbol
   * @param symbol - Asset symbol (e.g., 'BTC', 'ETH', 'USDC')
   * @returns Price in USD
   */
  async getPrice(symbol: string): Promise<number> {
    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      logger.debug(`Price cache hit for ${symbol}: $${cached.price}`);
      return cached.price;
    }

    // Fetch from NEAR Intents
    try {
      const price = await nearIntentsClient.getTokenPrice(symbol);
      
      if (price === null) {
        throw new Error(`Price not available for ${symbol}`);
      }
      
      // Cache the result
      this.priceCache.set(symbol, {
        price,
        timestamp: Date.now(),
      });

      logger.info(`Fetched price for ${symbol}: $${price}`);
      return price;
    } catch (error) {
      logger.error(`Failed to fetch price for ${symbol}`, { error });
      throw new Error(`Unable to fetch price for ${symbol}`);
    }
  }

  /**
   * Get prices for multiple assets in parallel
   * @param symbols - Array of asset symbols
   * @returns Map of symbol to price
   */
  async getPrices(symbols: string[]): Promise<Map<string, number>> {
    logger.info(`Fetching prices for ${symbols.length} assets...`);

    const pricePromises = symbols.map(async (symbol) => {
      try {
        const price = await this.getPrice(symbol);
        return { symbol, price };
      } catch (error) {
        logger.error(`Failed to fetch price for ${symbol}`, { error });
        return { symbol, price: 0 };
      }
    });

    const results = await Promise.all(pricePromises);
    const priceMap = new Map<string, number>();

    results.forEach(({ symbol, price }) => {
      priceMap.set(symbol, price);
    });

    logger.info(`Fetched ${priceMap.size} prices successfully`);
    return priceMap;
  }

  /**
   * Get all supported tokens with their current prices
   * @returns Array of tokens with prices
   */
  async getAllTokensWithPrices(): Promise<SupportedToken[]> {
    logger.info('Fetching all tokens with prices...');
    const tokens = await nearIntentsClient.getSupportedTokens();

    // Fetch prices for all unique symbols
    const uniqueSymbols = [...new Set(tokens.map((t) => t.symbol))];
    const prices = await this.getPrices(uniqueSymbols);

    // Attach prices to tokens
    const tokensWithPrices = tokens.map((token) => ({
      ...token,
      price: prices.get(token.symbol) || 0,
    }));

    logger.info(`Fetched ${tokensWithPrices.length} tokens with prices`);
    return tokensWithPrices;
  }

  /**
   * Calculate USD value of a token amount
   * @param symbol - Asset symbol
   * @param amount - Token amount
   * @returns USD value
   */
  async calculateUsdValue(symbol: string, amount: number): Promise<number> {
    const price = await this.getPrice(symbol);
    const usdValue = amount * price;
    
    logger.debug(`${amount} ${symbol} = $${usdValue.toFixed(2)}`);
    return usdValue;
  }

  /**
   * Calculate token amount needed for a USD value
   * @param symbol - Asset symbol
   * @param usdValue - Target USD value
   * @returns Token amount
   */
  async calculateTokenAmount(symbol: string, usdValue: number): Promise<number> {
    const price = await this.getPrice(symbol);
    if (price === 0) {
      throw new Error(`Cannot calculate amount for ${symbol}: price is 0`);
    }
    
    const amount = usdValue / price;
    logger.debug(`$${usdValue} = ${amount} ${symbol}`);
    return amount;
  }

  /**
   * Clear the price cache (useful for testing)
   */
  clearCache(): void {
    this.priceCache.clear();
    logger.info('Price cache cleared');
  }
}

// Singleton instance
export const priceService = new PriceService();

