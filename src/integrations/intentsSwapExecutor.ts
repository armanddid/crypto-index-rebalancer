/**
 * INTENTS Swap Executor using 1-Click API + Intents SDK
 * 
 * This module handles INTENTS-to-INTENTS swaps by:
 * 1. Getting a quote from 1-Click API (for pricing/routing and deposit address)
 * 2. Signing and sending a custom intent using the Intents SDK
 * 3. Monitoring the swap status until completion
 * 
 * Based on guidance from NEAR Intents team:
 * - Use 1-Click API for quotes
 * - Use sdk.signAndSendIntent() with custom intent for execution
 * 
 * Docs: https://www.npmjs.com/package/@defuse-protocol/intents-sdk
 */

import { IntentsSDK, createIntentSignerViem, Chains } from '@defuse-protocol/intents-sdk';
import { privateKeyToAccount } from 'viem/accounts';
import { nearIntentsClient } from './nearIntents.js';
import { QuoteRequest } from './nearIntentsTypes.js';
import { logger } from '../utils/logger.js';
import { getNearRpcUrl } from '../utils/near.js';

const ONE_CLICK_JWT = process.env.NEAR_INTENTS_JWT_TOKEN || '';

export interface IntentsSwapParams {
  evmPrivateKey: string; // EVM private key (for signing intents)
  evmAddress: string; // EVM address (lowercase, used as INTENTS account ID)
  fromAssetId: string; // Full asset ID: e.g., 'nep141:17208628...'
  toAssetId: string; // Full asset ID: e.g., 'nep141:nbtc.bridge.near'
  amount: string; // Amount in smallest units
  recipientAddress: string; // Recipient address (can be same as sender for INTENTS)
}

export interface IntentsSwapResult {
  depositAddress: string;
  depositTxHash?: string;
  status: 'PENDING_DEPOSIT' | 'KNOWN_DEPOSIT_TX' | 'PROCESSING' | 'SUCCESS' | 'REFUNDED' | 'FAILED';
  destinationTxHash?: string;
  amountOut?: string;
}

/**
 * Execute an INTENTS-to-INTENTS swap using 1-Click API + Intents SDK
 * 
 * Flow (confirmed by NEAR Intents team):
 * 1. Get quote from 1-Click API (provides deposit address and pricing)
 * 2. Sign and send custom intent using SDK with EVM wallet
 * 3. Monitor swap status until completion
 * 
 * @param params - Swap parameters
 * @returns Swap result with status and transaction hashes
 */
export async function executeIntentsSwap(params: IntentsSwapParams): Promise<IntentsSwapResult> {
  logger.info('Executing INTENTS swap using 1-Click API + SDK', {
    from: params.fromAssetId,
    to: params.toAssetId,
    amount: params.amount,
    evmAddress: params.evmAddress,
  });

  try {
    // Step 1: Get quote from 1-Click API
    logger.info('Step 1: Requesting swap quote from 1-Click API...');
    
    const quoteRequest: QuoteRequest = {
      dry: false, // Real quote with deposit address
      swapType: 'EXACT_INPUT',
      originAsset: params.fromAssetId,
      destinationAsset: params.toAssetId,
      amount: params.amount,
      slippageTolerance: 100, // 1% = 100 basis points
      depositType: 'INTENTS',
      refundType: 'INTENTS',
      recipientType: 'INTENTS',
      recipient: params.recipientAddress.toLowerCase(),
      refundTo: params.evmAddress.toLowerCase(),
      connectedWallets: [params.evmAddress.toLowerCase()],
      deadline: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    };

    const quote = await nearIntentsClient.requestQuote(quoteRequest);

    logger.info('Quote received from 1-Click API', {
      depositAddress: quote.quote.depositAddress,
      amountIn: quote.quote.amountInFormatted,
      amountOut: quote.quote.amountOutFormatted,
      timeEstimate: quote.quote.timeEstimate,
    });

    // Step 2: Initialize Intents SDK with EVM signer
    logger.info('Step 2: Initializing Intents SDK with EVM signer...');
    
    const viemAccount = privateKeyToAccount(params.evmPrivateKey as `0x${string}`);
    const intentSigner = createIntentSignerViem({ signer: viemAccount });

    const sdk = new IntentsSDK({
      referral: process.env.NEAR_INTENTS_REFERRAL_CODE || 'crypto-index-rebalancer',
      intentSigner,
      rpc: {
        [Chains.Near]: [getNearRpcUrl()],
      },
    });

    logger.info('SDK initialized with EVM signer', {
      evmAddress: params.evmAddress,
    });

    // Step 3: Sign and send custom intent (transfer from INTENTS to deposit address)
    logger.info('Step 3: Signing and sending custom intent...');
    
    // Create custom intent for INTENTS-to-INTENTS transfer
    // This tells the solver network to execute the swap
    // NOTE: Token ID must include the nep141: prefix
    const result = await sdk.signAndSendIntent({
      intents: [
        {
          intent: 'transfer',
          receiver_id: quote.quote.depositAddress, // Send to the deposit address from the quote
          tokens: {
            [params.fromAssetId]: params.amount, // Use full asset ID with nep141: prefix
          },
        },
      ],
      onBeforePublishIntent: async (data) => {
        logger.info('About to publish intent to solver network', {
          intentHash: data.intentHash,
          depositAddress: quote.quote.depositAddress,
          fromToken: params.fromAssetId,
          amount: params.amount,
        });
      },
    });

    logger.info('Intent published to solver network', {
      intentHash: result.intentHash,
      depositAddress: quote.quote.depositAddress,
    });

    // Step 4: Wait for intent settlement
    logger.info('Step 4: Waiting for intent settlement...');
    
    const intentTx = await sdk.waitForIntentSettlement({
      intentHash: result.intentHash,
    });

    logger.info('Intent settled successfully', {
      intentHash: result.intentHash,
      settlementTxHash: intentTx.hash,
    });

    // Step 5: Monitor swap status
    logger.info('Step 5: Monitoring swap status via 1-Click API...');
    
    let status = await nearIntentsClient.getSwapStatus(quote.quote.depositAddress);
    let pollCount = 0;
    const maxPolls = 60; // 10 minutes max (10s intervals)

    while (
      status.status !== 'SUCCESS' && 
      status.status !== 'REFUNDED' && 
      status.status !== 'FAILED' && 
      pollCount < maxPolls
    ) {
      logger.debug(`Poll #${pollCount + 1}: ${status.status}`, {
        intentHash: result.intentHash,
        depositAddress: quote.quote.depositAddress,
      });
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
      status = await nearIntentsClient.getSwapStatus(quote.quote.depositAddress);
      pollCount++;
    }

    logger.info('Swap completed successfully', {
      status: status.status,
      intentHash: result.intentHash,
      settlementTxHash: intentTx.hash,
      destinationTxHash: status.destinationTxHash,
      amountOut: status.amountOut,
      depositAddress: quote.quote.depositAddress,
    });

    return {
      depositAddress: quote.quote.depositAddress,
      depositTxHash: intentTx.hash, // Settlement transaction hash
      status: status.status as any,
      destinationTxHash: status.destinationTxHash,
      amountOut: status.amountOut,
    };

  } catch (error: any) {
    logger.error('INTENTS swap failed', {
      error: error.message,
      stack: error.stack,
      evmAddress: params.evmAddress,
      from: params.fromAssetId,
      to: params.toAssetId,
    });
    throw error;
  }
}

/**
 * Check the status of an INTENTS swap
 * 
 * @param depositAddress - The deposit address to check
 * @returns Current status of the swap
 */
export async function checkIntentsSwapStatus(depositAddress: string): Promise<IntentsSwapResult> {
  logger.debug('Checking INTENTS swap status', { depositAddress });

  try {
    const status = await nearIntentsClient.getSwapStatus(depositAddress);

    logger.debug('INTENTS swap status retrieved', {
      depositAddress,
      status: status.status,
    });

    return {
      depositAddress,
      status: status.status as any,
      destinationTxHash: status.destinationTxHash,
      amountOut: status.amountOut,
    };

  } catch (error: any) {
    logger.error('Failed to check INTENTS swap status', {
      error: error.message,
      depositAddress,
    });
    throw error;
  }
}
