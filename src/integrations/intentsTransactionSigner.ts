import { ethers } from 'ethers';
import { nearIntentsClient } from './nearIntents.js';
import { QuoteRequest, QuoteResponse } from './nearIntentsTypes.js';
import { logger } from '../utils/logger.js';

/**
 * INTENTS Transaction Signer
 * Handles signing and submitting transactions for INTENTS-to-INTENTS swaps
 */
export class IntentsTransactionSigner {
  /**
   * Execute an INTENTS-to-INTENTS swap using transaction signing
   * @param privateKey - Decrypted private key for signing
   * @param quoteRequest - Quote request parameters
   * @returns Quote response with transaction details
   */
  async executeIntentsSwap(
    privateKey: string,
    quoteRequest: QuoteRequest
  ): Promise<QuoteResponse> {
    logger.info('Executing INTENTS swap with transaction signing', {
      originAsset: quoteRequest.originAsset,
      destinationAsset: quoteRequest.destinationAsset,
      amount: quoteRequest.amount,
    });

    try {
      // 1. Create wallet from private key
      const wallet = new ethers.Wallet(privateKey);
      logger.debug('Wallet created', { address: wallet.address });

      // 2. For INTENTS swaps with connectedWallets:
      //    - The swap executes automatically if funds are in INTENTS
      //    - No deposit address is needed
      //    - The quote response will include transaction details

      // IMPORTANT: For this to work, the wallet must have funds in INTENTS
      // If funds are not in INTENTS, the API will return an error

      // Request quote with connected wallet
      const quoteWithWallet: QuoteRequest = {
        ...quoteRequest,
        connectedWallets: [wallet.address.toLowerCase()],
      };

      logger.debug('Requesting INTENTS swap with connected wallet', {
        connectedWallets: quoteWithWallet.connectedWallets,
        depositType: quoteRequest.depositType,
      });

      try {
        const quote = await nearIntentsClient.requestQuote(quoteWithWallet);

        logger.info('INTENTS swap executed successfully', {
          depositAddress: quote.depositAddress || 'N/A (direct swap)',
          amountIn: quote.amountIn,
          amountOut: quote.amountOut,
          timeEstimate: quote.timeEstimate,
        });

        return quote;
      } catch (error: any) {
        // If the error is about deposit address, it means funds aren't in INTENTS yet
        if (error.message && error.message.includes('Deposit address')) {
          logger.warn('INTENTS swap failed - funds may not be in INTENTS account yet', {
            wallet: wallet.address,
            error: error.message,
          });
          
          // For now, fall back to regular quote (which will provide a deposit address)
          // In production, this would mean the user needs to fund their INTENTS account first
          logger.info('Falling back to deposit-based swap');
          const fallbackQuote = await nearIntentsClient.requestQuote(quoteRequest);
          return fallbackQuote;
        }
        throw error;
      }
    } catch (error) {
      logger.error('Failed to execute INTENTS swap', { error });
      throw error;
    }
  }

  /**
   * Execute a swap that requires depositing from an external chain to INTENTS
   * @param privateKey - Decrypted private key for signing
   * @param quoteRequest - Quote request parameters
   * @returns Quote response with deposit address
   */
  async executeDepositSwap(
    privateKey: string,
    quoteRequest: QuoteRequest
  ): Promise<QuoteResponse> {
    logger.info('Executing deposit swap (external chain → INTENTS)', {
      originAsset: quoteRequest.originAsset,
      destinationAsset: quoteRequest.destinationAsset,
      amount: quoteRequest.amount,
    });

    try {
      // For deposit swaps, we just get the quote
      // The user (or our system) will send funds to the deposit address
      const quote = await nearIntentsClient.requestQuote(quoteRequest);

      logger.info('Deposit swap quote received', {
        depositAddress: quote.depositAddress,
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        deadline: quote.deadline,
      });

      // TODO: In a production system, we would:
      // 1. Create a wallet instance
      // 2. Send the tokens to the deposit address
      // 3. Monitor the transaction status
      
      // For now, we return the quote with the deposit address
      // The actual deposit would need to be done separately

      return quote;
    } catch (error) {
      logger.error('Failed to execute deposit swap', { error });
      throw error;
    }
  }

  /**
   * Determine if a swap is INTENTS-to-INTENTS or requires a deposit
   * @param depositType - Deposit type from quote request
   * @returns True if INTENTS-to-INTENTS
   */
  isIntentsToIntentsSwap(depositType?: string): boolean {
    return depositType === 'INTENTS';
  }

  /**
   * Sign a message with the private key (for future use)
   * @param privateKey - Decrypted private key
   * @param message - Message to sign
   * @returns Signature
   */
  async signMessage(privateKey: string, message: string): Promise<string> {
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(message);
    return signature;
  }

  /**
   * Get wallet address from private key
   * @param privateKey - Decrypted private key
   * @returns Wallet address
   */
  getWalletAddress(privateKey: string): string {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  }
}

// Singleton instance
export const intentsTransactionSigner = new IntentsTransactionSigner();

