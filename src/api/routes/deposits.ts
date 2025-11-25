// API routes for deposit address generation
// Allows users to get deposit addresses for funding their INTENTS account

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { nearIntentsClient } from '../../integrations/nearIntents.js';
import { QuoteRequest } from '../../integrations/nearIntentsTypes.js';
import { logger } from '../../utils/logger.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { findAccountById } from '../../storage/models/Account.js';

const router = Router();

// Validation schema for deposit address request
const getDepositAddressSchema = z.object({
  asset: z.string().min(1, 'Asset symbol is required'),
  blockchain: z.string().min(1, 'Blockchain is required'),
  amount: z.string().regex(/^\d+$/, 'Amount must be a positive integer string'),
});

/**
 * POST /api/deposits/:accountId/address
 * 
 * Generate a deposit address for funding the user's INTENTS account
 * 
 * The deposit will automatically convert the specified asset to USDC in INTENTS
 */
router.post('/:accountId/address', authenticate, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = (req as any).userId;

    logger.info('Generating deposit address', { userId, accountId, body: req.body });

    // Validate request body
    const validationResult = getDepositAddressSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.errors.map(e => e.message).join(', '));
    }

    const { asset, blockchain, amount } = validationResult.data;

    // Verify account belongs to user
    const account = findAccountById(accountId);
    if (!account) {
      throw new NotFoundError('Account');
    }
    if (account.userId !== userId) {
      throw new NotFoundError('Account');
    }

    // Get supported tokens
    const tokens = await nearIntentsClient.getSupportedTokens();

    // Find the origin asset (what user wants to deposit)
    const originToken = tokens.find(t => 
      t.symbol.toUpperCase() === asset.toUpperCase() && 
      t.blockchain === blockchain
    );
    if (!originToken) {
      throw new ValidationError(`Asset ${asset} on ${blockchain} is not supported`);
    }

    // Find USDC on the same blockchain (or default to ETH USDC)
    let usdcToken = tokens.find(t => 
      t.symbol === 'USDC' && 
      t.blockchain === blockchain
    );
    
    // If USDC not available on origin chain, use ETH USDC
    if (!usdcToken) {
      usdcToken = tokens.find(t => t.symbol === 'USDC' && t.blockchain === 'eth');
      if (!usdcToken) {
        throw new ValidationError('USDC not available for conversion');
      }
    }

    // Generate quote: Asset (origin chain) → USDC (INTENTS)
    const quoteRequest: QuoteRequest = {
      dry: false, // Real quote with deposit address
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100, // 1% slippage
      originAsset: originToken.assetId,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: usdcToken.assetId,
      amount,
      recipient: account.walletAddress.toLowerCase(), // INTENTS account (lowercase EVM)
      recipientType: 'INTENTS',
      refundTo: account.walletAddress,
      refundType: 'ORIGIN_CHAIN',
      deadline: new Date(Date.now() + 86400000).toISOString(), // 24 hours
    };

    logger.info('Requesting deposit quote', { 
      originAsset: originToken.symbol, 
      destinationAsset: 'USDC (INTENTS)',
      amount 
    });

    const quoteResponse = await nearIntentsClient.requestQuote(quoteRequest);

    logger.info('Deposit address generated', { 
      depositAddress: quoteResponse.quote.depositAddress,
      deadline: quoteResponse.quote.deadline 
    });

    // Calculate expiration time
    const deadlineDate = new Date(quoteResponse.quote.deadline);
    const expiresInSeconds = Math.floor((deadlineDate.getTime() - Date.now()) / 1000);

    // Return deposit information
    res.json({
      depositAddress: quoteResponse.quote.depositAddress,
      depositMemo: quoteResponse.quote.depositMemo,
      asset: originToken.symbol,
      blockchain: originToken.blockchain,
      amount: quoteResponse.quote.amountInFormatted,
      amountRaw: quoteResponse.quote.amountIn,
      destinationAsset: 'USDC',
      destinationChain: 'INTENTS',
      estimatedOutput: quoteResponse.quote.amountOutFormatted,
      estimatedOutputUsd: quoteResponse.quote.amountOutUsd,
      deadline: quoteResponse.quote.deadline,
      expiresIn: expiresInSeconds,
      timeEstimate: quoteResponse.quote.timeEstimate,
      intentsAccount: account.walletAddress.toLowerCase(),
      instructions: {
        step1: `Send exactly ${quoteResponse.quote.amountInFormatted} ${originToken.symbol} to the deposit address`,
        step2: `Funds will be automatically converted to USDC in your INTENTS account`,
        step3: `Estimated to receive ${quoteResponse.quote.amountOutFormatted} USDC`,
        step4: `Deposit address expires at ${deadlineDate.toISOString()}`,
      },
    });

  } catch (error: any) {
    logger.error('Failed to generate deposit address', { 
      error: error.message,
      accountId: req.params.accountId 
    });
    throw error;
  }
});

/**
 * GET /api/deposits/supported-assets
 * 
 * Get list of all supported assets for deposits
 */
router.get('/supported-assets', authenticate, async (req: Request, res: Response) => {
  try {
    logger.info('Fetching supported deposit assets');

    const tokens = await nearIntentsClient.getSupportedTokens();

    // Group by blockchain
    const assetsByChain: Record<string, any[]> = {};
    
    tokens.forEach(token => {
      if (!assetsByChain[token.blockchain]) {
        assetsByChain[token.blockchain] = [];
      }
      assetsByChain[token.blockchain].push({
        symbol: token.symbol,
        assetId: token.assetId,
        decimals: token.decimals,
        price: token.price,
        contractAddress: token.contractAddress,
      });
    });

    res.json({
      totalAssets: tokens.length,
      blockchains: Object.keys(assetsByChain),
      assetsByChain,
    });

  } catch (error: any) {
    logger.error('Failed to fetch supported assets', { error: error.message });
    throw error;
  }
});

export default router;

