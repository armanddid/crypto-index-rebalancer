// Assets routes - Available tokens for index creation

import { Router, Response } from 'express';
import { nearIntentsClient } from '../../integrations/nearIntents.js';
import { optionalAuthenticate, AuthRequest } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// Optional authentication - public endpoint but can be authenticated
router.use(optionalAuthenticate);

/**
 * GET /api/assets
 * Get all available assets from NEAR Intents
 * 
 * This endpoint is used by the Advisory Agent to know what assets
 * are available for index creation
 */
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    logger.info('Fetching available assets for index creation');

    // Get supported tokens from NEAR Intents
    const tokens = await nearIntentsClient.getSupportedTokens();

    // Transform to a more user-friendly format
    const assets = tokens.map(token => ({
      symbol: token.symbol,
      name: token.symbol, // NEAR Intents doesn't provide full names
      blockchain: token.blockchain,
      assetId: token.assetId,
      price: parseFloat(token.price),
      priceUsd: parseFloat(token.price),
      decimals: token.decimals,
      contractAddress: token.contractAddress,
      priceUpdatedAt: token.priceUpdatedAt,
    }));

    // Group by symbol for easier consumption
    const assetsBySymbol: Record<string, any[]> = {};
    assets.forEach(asset => {
      if (!assetsBySymbol[asset.symbol]) {
        assetsBySymbol[asset.symbol] = [];
      }
      assetsBySymbol[asset.symbol].push(asset);
    });

    // Create a summary list (unique symbols with their primary chain)
    const assetSummary = Object.entries(assetsBySymbol).map(([symbol, chains]) => {
      // Prefer certain chains as "primary"
      const chainPriority = ['eth', 'near', 'sol', 'btc', 'arb', 'base'];
      const primaryAsset = chains.find(a => chainPriority.includes(a.blockchain)) || chains[0];
      
      return {
        symbol: symbol,
        price: primaryAsset.price,
        primaryBlockchain: primaryAsset.blockchain,
        availableOn: chains.map(c => c.blockchain),
        chainCount: chains.length,
      };
    }).sort((a, b) => {
      // Sort by price (descending) for better UX
      return b.price - a.price;
    });

    res.json({
      assets: assets,
      assetsBySymbol: assetsBySymbol,
      summary: assetSummary,
      metadata: {
        totalAssets: assets.length,
        uniqueSymbols: Object.keys(assetsBySymbol).length,
        blockchains: [...new Set(assets.map(a => a.blockchain))],
        lastUpdated: new Date().toISOString(),
      },
    });

    logger.info(`Returned ${assets.length} assets (${Object.keys(assetsBySymbol).length} unique symbols)`);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assets/symbols
 * Get just the list of available symbols (lightweight)
 * 
 * Useful for quick lookups or autocomplete
 */
router.get('/symbols', async (req: AuthRequest, res: Response, next) => {
  try {
    const tokens = await nearIntentsClient.getSupportedTokens();
    
    // Get unique symbols
    const symbols = [...new Set(tokens.map(t => t.symbol))].sort();

    res.json({
      symbols: symbols,
      count: symbols.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assets/:symbol
 * Get details for a specific asset symbol
 * 
 * Returns all chains where this asset is available
 */
router.get('/:symbol', async (req: AuthRequest, res: Response, next) => {
  try {
    const { symbol } = req.params;
    const blockchain = req.query.blockchain as string | undefined;

    logger.info(`Fetching asset details for ${symbol}${blockchain ? ` on ${blockchain}` : ''}`);

    const tokens = await nearIntentsClient.getSupportedTokens();
    
    // Find matching tokens
    const matches = tokens.filter(token => 
      token.symbol.toUpperCase() === symbol.toUpperCase() &&
      (!blockchain || token.blockchain === blockchain)
    );

    if (matches.length === 0) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Asset ${symbol}${blockchain ? ` on ${blockchain}` : ''} not found`,
        code: 'ASSET_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Transform to user-friendly format
    const assets = matches.map(token => ({
      symbol: token.symbol,
      blockchain: token.blockchain,
      assetId: token.assetId,
      price: parseFloat(token.price),
      priceUsd: parseFloat(token.price),
      decimals: token.decimals,
      contractAddress: token.contractAddress,
      priceUpdatedAt: token.priceUpdatedAt,
    }));

    res.json({
      symbol: symbol.toUpperCase(),
      assets: assets,
      availableOn: assets.map(a => a.blockchain),
      count: assets.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assets/blockchains
 * Get list of supported blockchains
 */
router.get('/blockchains/list', async (req: AuthRequest, res: Response, next) => {
  try {
    const tokens = await nearIntentsClient.getSupportedTokens();
    
    // Get unique blockchains with token counts
    const blockchainCounts: Record<string, number> = {};
    tokens.forEach(token => {
      blockchainCounts[token.blockchain] = (blockchainCounts[token.blockchain] || 0) + 1;
    });

    const blockchains = Object.entries(blockchainCounts)
      .map(([blockchain, tokenCount]) => ({
        blockchain,
        tokenCount,
      }))
      .sort((a, b) => b.tokenCount - a.tokenCount);

    res.json({
      blockchains: blockchains,
      count: blockchains.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

