import { Router, Request, Response } from 'express';
import db from '../../storage/database.js';
import { decryptPrivateKey } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * GET /api/admin/wallets
 * Retrieve all wallets (ADMIN ONLY - for recovery purposes)
 */
router.get('/wallets', async (req: Request, res: Response) => {
  try {
    const accounts = db.prepare(`
      SELECT account_id, user_id, name, wallet_address, encrypted_private_key, created_at
      FROM accounts
      ORDER BY created_at DESC
      LIMIT 20
    `).all();

    const walletsWithKeys = (accounts as any[]).map((account) => {
      try {
        const privateKey = decryptPrivateKey(account.encrypted_private_key);
        return {
          accountId: account.account_id,
          walletAddress: account.wallet_address,
          intentsAccount: account.wallet_address.toLowerCase(),
          privateKey,
          createdAt: account.created_at,
        };
      } catch (error) {
        return {
          accountId: account.account_id,
          walletAddress: account.wallet_address,
          intentsAccount: account.wallet_address.toLowerCase(),
          privateKey: 'DECRYPTION_FAILED',
          createdAt: account.created_at,
        };
      }
    });

    logger.info('Retrieved wallets for recovery', { count: walletsWithKeys.length });

    res.json({
      success: true,
      wallets: walletsWithKeys,
      count: walletsWithKeys.length,
    });
  } catch (error) {
    logger.error('Error retrieving wallets', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve wallets',
    });
  }
});

export default router;

