// Account routes

import { Router, Response } from 'express';
import { createAccount, findAccountById, listAccountsByUserId, userOwnsAccount } from '../../storage/models/Account.js';
import { generateWallet, encryptWalletPrivateKey, generateDepositAddresses } from '../../integrations/walletManager.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../../utils/validation.js';
import { createAccountSchema } from '../../utils/validation.js';
import { NotFoundError, AuthorizationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { getIntentsBalances } from '../../integrations/intentsBalanceChecker.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/accounts
 * Create a new account with wallet
 */
router.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, email } = validateBody(createAccountSchema, req.body);
    const userId = req.userId!;

    // Generate wallet
    const wallet = generateWallet();
    
    // Encrypt private key
    const encryptedPrivateKey = encryptWalletPrivateKey(wallet.privateKey);
    
    // Generate deposit addresses
    const depositAddresses = generateDepositAddresses(wallet.address);

    // Create account
    const account = createAccount(
      userId,
      name,
      wallet.address,
      encryptedPrivateKey,
      depositAddresses
    );

    logger.info(`Account created: ${account.accountId} for user ${userId}`);

    res.status(201).json({
      accountId: account.accountId,
      userId: account.userId,
      name: account.name,
      walletAddress: account.walletAddress,
      depositAddresses: account.depositAddresses,
      createdAt: account.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/accounts/:accountId
 * Get account details
 */
router.get('/:accountId', (req: AuthRequest, res: Response, next) => {
  try {
    const { accountId } = req.params;
    const userId = req.userId!;

    // Find account
    const account = findAccountById(accountId);
    if (!account) {
      throw new NotFoundError('Account', accountId);
    }

    // Check ownership
    if (!userOwnsAccount(userId, accountId)) {
      throw new AuthorizationError('You do not have access to this account');
    }

    res.json({
      accountId: account.accountId,
      userId: account.userId,
      name: account.name,
      walletAddress: account.walletAddress,
      depositAddresses: account.depositAddresses,
      createdAt: account.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/accounts
 * List user's accounts
 */
router.get('/', (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { accounts, total } = listAccountsByUserId(userId, page, limit);

    res.json({
      accounts: accounts.map(account => ({
        accountId: account.accountId,
        userId: account.userId,
        name: account.name,
        walletAddress: account.walletAddress,
        depositAddresses: account.depositAddresses,
        createdAt: account.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/accounts/:accountId/balance
 * Get account balance from EVM wallets and INTENTS vault
 */
router.get('/:accountId/balance', async (req: AuthRequest, res: Response, next) => {
  try {
    const { accountId } = req.params;
    const userId = req.userId!;

    // Find account
    const account = findAccountById(accountId);
    if (!account) {
      throw new NotFoundError('Account', accountId);
    }

    // Check ownership
    if (!userOwnsAccount(userId, accountId)) {
      throw new AuthorizationError('You do not have access to this account');
    }

    // Initialize with EVM placeholder (existing behavior)
    const balances: Record<string, Record<string, { amount: number; usdValue: number }>> = {
      ethereum: {
        ETH: { amount: 0, usdValue: 0 },
        USDC: { amount: 0, usdValue: 0 },
      },
      intents: {},
    };

    let totalUsdValue = 0;

    // Fetch INTENTS vault balances (NEAR-side deposits)
    try {
      const intentsBalances = await getIntentsBalances(account.walletAddress);
      for (const token of intentsBalances.tokens) {
        balances.intents[token.symbol] = {
          amount: parseFloat(token.balanceFormatted),
          usdValue: token.usdValue || 0,
        };
        totalUsdValue += token.usdValue || 0;
      }
    } catch (intentsError: any) {
      logger.warn('Failed to fetch INTENTS balances', { error: intentsError.message });
      // Continue with EVM balances only
    }

    res.json({
      accountId: account.accountId,
      balances,
      totalUsdValue,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

