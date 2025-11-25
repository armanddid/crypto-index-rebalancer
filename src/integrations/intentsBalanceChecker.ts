/**
 * INTENTS Balance Checker
 * 
 * Queries actual token balances in INTENTS for a given account.
 * This is critical for rebalancing to know which tokens and amounts are available.
 */

import { connect, keyStores, KeyPair } from 'near-api-js';
import { logger } from '../utils/logger.js';
import { getNearRpcUrl } from '../utils/near.js';
import { generateNearKeyPairFromEVM } from './nearKeyPairHelper.js';

export interface TokenBalance {
  assetId: string;
  symbol: string;
  balance: string; // Raw balance in smallest units
  balanceFormatted: string; // Human-readable balance
  decimals: number;
}

export interface IntentsBalances {
  accountId: string;
  tokens: TokenBalance[];
  timestamp: Date;
}

/**
 * Get all token balances in INTENTS for an account
 * 
 * @param evmPrivateKey - EVM private key for signing
 * @param evmAddress - EVM address (used as INTENTS account ID)
 * @returns Token balances
 */
export async function getIntentsBalances(
  evmPrivateKey: string,
  evmAddress: string
): Promise<IntentsBalances> {
  logger.info('Fetching INTENTS balances', { evmAddress });

  try {
    const accountId = evmAddress.toLowerCase();

    // Connect to NEAR
    const keyPair = generateNearKeyPairFromEVM(evmPrivateKey);
    const keyStore = new keyStores.InMemoryKeyStore();
    await keyStore.setKey('mainnet', accountId, keyPair);

    const near = await connect({
      networkId: 'mainnet',
      keyStore,
      nodeUrl: getNearRpcUrl(),
    });

    const account = await near.account(accountId);

    // Query NEAR RPC for account balances
    // The INTENTS contract stores balances as FT (Fungible Token) balances
    logger.info('Querying INTENTS contract for balances...', { accountId });

    // Call the NEAR contract to get balances
    // The intents.near contract has a view method to get account balances
    const balances = await account.viewFunction({
      contractId: 'intents.near',
      methodName: 'get_account_balances',
      args: { account_id: accountId },
    });

    logger.info('Raw balances received from INTENTS', { balances });

    // Parse balances into structured format
    const tokens: TokenBalance[] = [];

    if (balances && typeof balances === 'object') {
      for (const [assetId, balance] of Object.entries(balances)) {
        // Extract symbol from asset ID
        // Format: nep141:base-0x833589... or nep141:token.near
        let symbol = 'UNKNOWN';
        if (assetId.includes('base-')) {
          symbol = 'USDC (Base)';
        } else if (assetId.includes('eth-')) {
          symbol = 'Token (Ethereum)';
        } else if (assetId.includes('arb-')) {
          symbol = 'Token (Arbitrum)';
        } else if (assetId.includes('nbtc')) {
          symbol = 'BTC';
        } else if (assetId.includes('wrap.near')) {
          symbol = 'NEAR';
        }

        // Assume 6 decimals for most tokens (we can enhance this later)
        const decimals = 6;
        const balanceStr = balance as string;
        const balanceFormatted = (parseInt(balanceStr) / Math.pow(10, decimals)).toFixed(decimals);

        if (parseInt(balanceStr) > 0) {
          tokens.push({
            assetId,
            symbol,
            balance: balanceStr,
            balanceFormatted,
            decimals,
          });
        }
      }
    }

    logger.info('Parsed INTENTS balances', {
      accountId,
      tokenCount: tokens.length,
      tokens: tokens.map(t => `${t.symbol}: ${t.balanceFormatted}`),
    });

    return {
      accountId,
      tokens,
      timestamp: new Date(),
    };

  } catch (error: any) {
    logger.error('Failed to fetch INTENTS balances', {
      error: error.message,
      evmAddress,
    });
    throw error;
  }
}

/**
 * Get balance for a specific token in INTENTS
 * 
 * @param evmPrivateKey - EVM private key
 * @param evmAddress - EVM address
 * @param assetId - Token asset ID (e.g., 'nep141:base-0x833589...')
 * @returns Token balance or null if not found
 */
export async function getTokenBalance(
  evmPrivateKey: string,
  evmAddress: string,
  assetId: string
): Promise<TokenBalance | null> {
  const balances = await getIntentsBalances(evmPrivateKey, evmAddress);
  return balances.tokens.find(t => t.assetId === assetId) || null;
}

/**
 * Find USDC tokens in INTENTS (any chain)
 * 
 * @param evmPrivateKey - EVM private key
 * @param evmAddress - EVM address
 * @returns Array of USDC token balances
 */
export async function findUSDCBalances(
  evmPrivateKey: string,
  evmAddress: string
): Promise<TokenBalance[]> {
  const balances = await getIntentsBalances(evmPrivateKey, evmAddress);
  
  // Find all USDC tokens (Base, Ethereum, Arbitrum, etc.)
  return balances.tokens.filter(t => 
    t.assetId.includes('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913') || // Base USDC
    t.assetId.includes('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') || // Ethereum USDC
    t.assetId.includes('0xaf88d065e77c8cc2239327c5edb3a432268e5831') || // Arbitrum USDC
    t.assetId.includes('17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1') // Generic USDC
  );
}

