/**
 * INTENTS Balance Checker
 *
 * Queries token balances in the intents.near contract for EVM addresses.
 * Uses mt_batch_balance_of (Multi-Token NEP-245 standard) for efficient batch queries.
 */

import { connect, keyStores } from 'near-api-js';
import { logger } from '../utils/logger.js';
import { getNearRpcUrl } from '../utils/near.js';

export interface TokenBalance {
  assetId: string;
  symbol: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  usdValue?: number;
}

export interface IntentsBalances {
  accountId: string;
  tokens: TokenBalance[];
  totalUsdValue: number;
  timestamp: Date;
}

/**
 * Supported tokens for INTENTS balance queries.
 * Maps token asset IDs to metadata for proper formatting.
 */
const SUPPORTED_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near': { symbol: 'USDC', decimals: 6 },
  'nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near': { symbol: 'USDT', decimals: 6 },
  'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near': { symbol: 'USDC', decimals: 6 },
  'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near': { symbol: 'USDC', decimals: 6 },
  'nep141:sol.omft.near': { symbol: 'SOL', decimals: 9 },
  'nep141:eth.omft.near': { symbol: 'ETH', decimals: 18 },
  'nep141:btc.omft.near': { symbol: 'BTC', decimals: 8 },
  'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1': { symbol: 'USDC', decimals: 6 },
  'nep141:usdt.tether-token.near': { symbol: 'USDT', decimals: 6 },
  'nep141:wrap.near': { symbol: 'NEAR', decimals: 24 },
};

/**
 * Get token balances in intents.near for an EVM address.
 * This is a view-only call - no private key required.
 *
 * @param evmAddress - EVM address (0x...) used as INTENTS account ID
 * @returns Token balances with formatted amounts
 */
export async function getIntentsBalances(evmAddress: string): Promise<IntentsBalances> {
  const accountId = evmAddress.toLowerCase();
  logger.info('Fetching INTENTS balances', { accountId });

  try {
    // Connect to NEAR (read-only, no key needed)
    const near = await connect({
      networkId: 'mainnet',
      keyStore: new keyStores.InMemoryKeyStore(),
      nodeUrl: getNearRpcUrl(),
    });

    const viewAccount = await near.account('');
    const tokenIds = Object.keys(SUPPORTED_TOKENS);

    // Query intents.near using NEP-245 Multi-Token standard
    const rawBalances = await viewAccount.viewFunction({
      contractId: 'intents.near',
      methodName: 'mt_batch_balance_of',
      args: { account_id: accountId, token_ids: tokenIds },
    }) as string[];

    // Parse results into structured format
    const tokens: TokenBalance[] = [];
    let totalUsdValue = 0;

    rawBalances.forEach((balance, index) => {
      const balanceNum = BigInt(balance || '0');
      if (balanceNum > 0n) {
        const assetId = tokenIds[index];
        const meta = SUPPORTED_TOKENS[assetId];
        const balanceFormatted = formatBalance(balance, meta.decimals);

        // Estimate USD value (stablecoins = 1:1, others need price feed)
        const usdValue = ['USDC', 'USDT'].includes(meta.symbol)
          ? parseFloat(balanceFormatted)
          : 0;

        totalUsdValue += usdValue;

        tokens.push({
          assetId,
          symbol: meta.symbol,
          balance,
          balanceFormatted,
          decimals: meta.decimals,
          usdValue,
        });
      }
    });

    logger.info('INTENTS balances fetched', {
      accountId,
      tokenCount: tokens.length,
      tokens: tokens.map(t => `${t.symbol}: ${t.balanceFormatted}`),
      totalUsdValue,
    });

    return { accountId, tokens, totalUsdValue, timestamp: new Date() };

  } catch (error: any) {
    logger.error('Failed to fetch INTENTS balances', { error: error.message, accountId });
    // Return empty balances on error (graceful degradation)
    return { accountId, tokens: [], totalUsdValue: 0, timestamp: new Date() };
  }
}

/**
 * Get USDC balance specifically (most common use case for deposits).
 * Aggregates all USDC variants (ETH, Base, Arbitrum, etc.)
 */
export async function getUsdcBalance(evmAddress: string): Promise<number> {
  const balances = await getIntentsBalances(evmAddress);
  return balances.tokens
    .filter(t => t.symbol === 'USDC' || t.symbol === 'USDT')
    .reduce((sum, t) => sum + parseFloat(t.balanceFormatted), 0);
}

/**
 * Format raw balance to human-readable string
 */
function formatBalance(rawBalance: string, decimals: number): string {
  const balance = BigInt(rawBalance || '0');
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const fraction = balance % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0');
  return `${whole}.${fractionStr.slice(0, 6)}`;
}

// Legacy exports for backward compatibility
export async function getTokenBalance(
  _evmPrivateKey: string,
  evmAddress: string,
  assetId: string
): Promise<TokenBalance | null> {
  const balances = await getIntentsBalances(evmAddress);
  return balances.tokens.find(t => t.assetId === assetId) || null;
}

export async function findUSDCBalances(
  _evmPrivateKey: string,
  evmAddress: string
): Promise<TokenBalance[]> {
  const balances = await getIntentsBalances(evmAddress);
  return balances.tokens.filter(t => t.symbol === 'USDC' || t.symbol === 'USDT');
}
