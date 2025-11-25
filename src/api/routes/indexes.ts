import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createIndex,
  findIndexById,
  findIndexesByAccountId,
  updateIndex,
  deleteIndex,
} from '../../storage/models/Index.js';
import { findAccountById } from '../../storage/models/Account.js';
import { createRebalance } from '../../storage/models/Rebalance.js';
import { portfolioService } from '../../services/PortfolioService.js';
import { driftCalculator } from '../../services/DriftCalculator.js';
import { priceService } from '../../services/PriceService.js';
import { indexService } from '../../services/IndexService.js';
import { nearIntentsClient } from '../../integrations/nearIntents.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import {
  createIndexSchema,
  updateIndexSchema,
  triggerRebalanceSchema,
} from '../../utils/validation.js';
import { Index, RebalancingMethod, IndexStatus } from '../../types/index.js';

const router = Router();

/**
 * POST /api/indexes
 * Create a new index
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const validatedData = createIndexSchema.parse(req.body);

    // Validate account exists and belongs to user
    const account = findAccountById(validatedData.accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }
    if (account.userId !== userId) {
      throw new ValidationError('Account does not belong to user');
    }

    // Validate allocations sum to 100%
    const totalPercentage = validatedData.allocations.reduce(
      (sum, alloc) => sum + alloc.percentage,
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new ValidationError(
        `Allocations must sum to 100% (got ${totalPercentage}%)`
      );
    }

    // Validate all assets are supported
    const tokens = await nearIntentsClient.getSupportedTokens();
    const supportedSymbols = new Set(tokens.map((t) => t.symbol));
    
    for (const alloc of validatedData.allocations) {
      if (!supportedSymbols.has(alloc.symbol)) {
        throw new ValidationError(`Asset ${alloc.symbol} is not supported`);
      }
    }

    // Create index with default configs
    const rebalancingConfig = {
      method: validatedData.rebalancingMethod || 'NONE',
      driftThreshold: validatedData.driftThresholdPercent || 5,
      minRebalanceInterval: `${validatedData.rebalancingIntervalHours || 24}h`,
    };

    const riskConfig = {
      maxSlippage: 1, // 1% default
      maxTradeSize: 100000, // $100k default
    };

    const index = createIndex(
      validatedData.accountId,
      validatedData.name,
      validatedData.description,
      validatedData.allocations,
      rebalancingConfig,
      riskConfig
    );

    logger.info('Index created', {
      indexId: index.indexId,
      accountId: index.accountId,
      name: index.name,
    });

    // If there's USDC balance, trigger initial construction
    // This would be done asynchronously in production
    res.status(201).json({
      success: true,
      index: {
        indexId: index.indexId,
        accountId: index.accountId,
        name: index.name,
        allocations: validatedData.allocations,
        rebalancingMethod: validatedData.rebalancingMethod || 'NONE',
        driftThresholdPercent: validatedData.driftThresholdPercent || 5,
        rebalancingIntervalHours: validatedData.rebalancingIntervalHours || 24,
        status: index.status,
        createdAt: index.createdAt,
      },
      message: 'Index created successfully. Fund your account to start construction.',
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      logger.error('Error creating index', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to create index',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
});

/**
 * GET /api/indexes/:indexId
 * Get index details
 */
router.get('/:indexId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { indexId } = req.params;

    const index = findIndexById(indexId);
    if (!index) {
      throw new NotFoundError('Index not found');
    }

    // Verify ownership
    const account = findAccountById(index.accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundError('Index not found');
    }

    // Calculate current value and drift if index is active
    let driftAnalysis = null;

    if (index.status === 'ACTIVE') {
      try {
        driftAnalysis = await indexService.calculateCurrentDrift(indexId);
      } catch (error) {
        logger.warn('Failed to calculate drift', { indexId, error });
      }
    }

    res.json({
      success: true,
      index: {
        ...index,
        driftAnalysis,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      logger.error('Error fetching index', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch index',
      });
    }
  }
});

/**
 * GET /api/indexes
 * List all indexes for authenticated user
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Get all accounts for user
    // TODO: Implement findAccountsByUserId
    // For now, return empty array
    const indexes: Index[] = [];

    res.json({
      success: true,
      indexes,
      count: indexes.length,
    });
  } catch (error) {
    logger.error('Error listing indexes', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list indexes',
    });
  }
});

/**
 * PUT /api/indexes/:indexId
 * Update index settings
 */
router.put('/:indexId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { indexId } = req.params;
    const validatedData = updateIndexSchema.parse(req.body);

    const index = findIndexById(indexId);
    if (!index) {
      throw new NotFoundError('Index not found');
    }

    // Verify ownership
    const account = findAccountById(index.accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundError('Index not found');
    }

    // Update index
    updateIndex(indexId, validatedData);

    logger.info('Index updated', { indexId });

    res.json({
      success: true,
      message: 'Index updated successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      logger.error('Error updating index', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update index',
      });
    }
  }
});

/**
 * POST /api/indexes/:indexId/construct
 * Trigger initial portfolio construction
 */
router.post('/:indexId/construct', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { indexId } = req.params;

    const index = findIndexById(indexId);
    if (!index) {
      throw new NotFoundError('Index not found');
    }

    // Verify ownership
    const account = findAccountById(index.accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundError('Index not found');
    }

    logger.info('Initial construction triggered', { indexId });

    // Execute initial construction
    await indexService.constructInitialPortfolio(indexId);

    res.json({
      success: true,
      message: 'Initial portfolio construction completed successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      logger.error('Error constructing portfolio', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to construct portfolio',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
});

/**
 * POST /api/indexes/:indexId/rebalance
 * Trigger manual rebalancing
 */
router.post('/:indexId/rebalance', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { indexId } = req.params;

    const index = findIndexById(indexId);
    if (!index) {
      throw new NotFoundError('Index not found');
    }

    // Verify ownership
    const account = findAccountById(index.accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundError('Index not found');
    }

    logger.info('Manual rebalance triggered', { indexId });

    // Execute rebalancing
    const rebalanced = await indexService.executeRebalancing(indexId);

    if (!rebalanced) {
      res.json({
        success: true,
        message: 'Rebalancing not needed - portfolio is within drift threshold',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Rebalancing completed successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      logger.error('Error triggering rebalance', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to trigger rebalance',
      });
    }
  }
});

/**
 * POST /api/indexes/:indexId/pause
 * Pause index (stop automatic rebalancing)
 */
router.post('/:indexId/pause', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { indexId } = req.params;

    const index = findIndexById(indexId);
    if (!index) {
      throw new NotFoundError('Index not found');
    }

    // Verify ownership
    const account = findAccountById(index.accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundError('Index not found');
    }

    updateIndex(indexId, { status: 'PAUSED' as IndexStatus });

    logger.info('Index paused', { indexId });

    res.json({
      success: true,
      message: 'Index paused successfully',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      logger.error('Error pausing index', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to pause index',
      });
    }
  }
});

/**
 * POST /api/indexes/:indexId/resume
 * Resume paused index
 */
router.post('/:indexId/resume', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { indexId } = req.params;

    const index = findIndexById(indexId);
    if (!index) {
      throw new NotFoundError('Index not found');
    }

    // Verify ownership
    const account = findAccountById(index.accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundError('Index not found');
    }

    if (index.status !== 'PAUSED') {
      throw new ValidationError('Index must be PAUSED to resume');
    }

    updateIndex(indexId, { status: 'ACTIVE' as IndexStatus });

    logger.info('Index resumed', { indexId });

    res.json({
      success: true,
      message: 'Index resumed successfully',
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      logger.error('Error resuming index', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to resume index',
      });
    }
  }
});

/**
 * DELETE /api/indexes/:indexId
 * Delete index
 */
router.delete('/:indexId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { indexId } = req.params;

    const index = findIndexById(indexId);
    if (!index) {
      throw new NotFoundError('Index not found');
    }

    // Verify ownership
    const account = findAccountById(index.accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundError('Index not found');
    }

    // Mark as deleted (soft delete)
    updateIndex(indexId, { status: 'DELETED' as IndexStatus });

    logger.info('Index deleted', { indexId });

    res.json({
      success: true,
      message: 'Index deleted successfully',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      logger.error('Error deleting index', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete index',
      });
    }
  }
});

export default router;

