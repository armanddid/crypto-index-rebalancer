// NEAR Intents 1Click API Client
// Documentation: https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';
import {
  SupportedToken,
  QuoteRequest,
  QuoteResponse,
  DepositSubmitRequest,
  DepositSubmitResponse,
  SwapStatusResponse,
  NEARIntentsError,
} from './nearIntentsTypes.js';

const BASE_URL = process.env.NEAR_INTENTS_API_URL || 'https://1click.chaindefuser.com';
const JWT_TOKEN = process.env.NEAR_INTENTS_JWT_TOKEN; // Optional, avoids 0.1% fee

/**
 * NEAR Intents 1Click API Client
 */
class NEARIntentsClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        ...(JWT_TOKEN && { Authorization: `Bearer ${JWT_TOKEN}` }),
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const errorData = error.response.data as NEARIntentsError;
          logger.error('NEAR Intents API error:', {
            status: error.response.status,
            error: errorData.error,
            message: errorData.message,
          });
          throw new ExternalServiceError(
            'NEAR Intents',
            errorData.message || 'API request failed',
            {
              statusCode: error.response.status,
              error: errorData.error,
            }
          );
        } else if (error.request) {
          logger.error('NEAR Intents API no response:', error.message);
          throw new ExternalServiceError('NEAR Intents', 'No response from API');
        } else {
          logger.error('NEAR Intents API request error:', error.message);
          throw new ExternalServiceError('NEAR Intents', error.message);
        }
      }
    );

    logger.info('NEAR Intents client initialized', {
      baseURL: BASE_URL,
      hasJWT: !!JWT_TOKEN,
    });
  }

  /**
   * MILESTONE 1: Get supported tokens
   * GET /v0/tokens
   */
  async getSupportedTokens(): Promise<SupportedToken[]> {
    try {
      logger.info('Fetching supported tokens from NEAR Intents...');
      
      const response = await this.client.get<SupportedToken[]>('/v0/tokens');
      
      logger.info(`Fetched ${response.data.length} supported tokens`);
      
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch supported tokens:', error);
      throw error;
    }
  }

  /**
   * MILESTONE 2 & 3: Request a swap quote
   * POST /v0/quote
   * 
   * @param request - Quote request parameters
   * @returns Quote response with deposit address (if dry: false)
   */
  async requestQuote(request: QuoteRequest): Promise<QuoteResponse> {
    try {
      logger.info('Requesting quote from NEAR Intents...', {
        dry: request.dry,
        swapType: request.swapType,
        originAsset: request.originAsset,
        destinationAsset: request.destinationAsset,
        amount: request.amount,
      });
      
      const response = await this.client.post<QuoteResponse>('/v0/quote', request);
      
      logger.info('Quote received', {
        dry: request.dry,
        depositAddress: response.data.quote.depositAddress,
        amountIn: response.data.quote.amountInFormatted,
        amountOut: response.data.quote.amountOutFormatted,
        deadline: response.data.quote.deadline,
        timeEstimate: response.data.quote.timeEstimate,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to request quote:', error);
      throw error;
    }
  }

  /**
   * MILESTONE 4: Submit deposit transaction hash
   * POST /v0/deposit/submit
   * 
   * Optional endpoint to speed up swap processing
   * 
   * @param request - Deposit submission parameters
   * @returns Submission confirmation
   */
  async submitDepositTransaction(request: DepositSubmitRequest): Promise<DepositSubmitResponse> {
    try {
      logger.info('Submitting deposit transaction to NEAR Intents...', {
        depositAddress: request.depositAddress,
        txHash: request.txHash,
      });
      
      const response = await this.client.post<DepositSubmitResponse>('/v0/deposit/submit', request);
      
      logger.info('Deposit transaction submitted', {
        success: response.data.success,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to submit deposit transaction:', error);
      throw error;
    }
  }

  /**
   * MILESTONE 5: Check swap execution status
   * GET /v0/status
   * 
   * @param depositAddress - Unique deposit address from quote
   * @param depositMemo - Optional memo (required for some chains like Stellar)
   * @returns Current swap status and details
   */
  async getSwapStatus(depositAddress: string, depositMemo?: string): Promise<SwapStatusResponse> {
    try {
      logger.debug('Checking swap status...', { depositAddress });
      
      const params: Record<string, string> = { depositAddress };
      if (depositMemo) {
        params.depositMemo = depositMemo;
      }
      
      const response = await this.client.get<SwapStatusResponse>('/v0/status', { params });
      
      logger.debug('Swap status retrieved', {
        depositAddress,
        status: response.data.status,
        updatedAt: response.data.updatedAt,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get swap status:', error);
      throw error;
    }
  }

  /**
   * Helper: Find token by symbol
   */
  async findTokenBySymbol(symbol: string, blockchain?: string): Promise<SupportedToken | null> {
    const tokens = await this.getSupportedTokens();
    
    const matches = tokens.filter(token => {
      const symbolMatch = token.symbol.toUpperCase() === symbol.toUpperCase();
      const blockchainMatch = !blockchain || token.blockchain === blockchain;
      return symbolMatch && blockchainMatch;
    });
    
    if (matches.length === 0) {
      logger.warn(`Token not found: ${symbol}${blockchain ? ` on ${blockchain}` : ''}`);
      return null;
    }
    
    if (matches.length > 1) {
      logger.warn(`Multiple tokens found for ${symbol}, returning first match`, {
        matches: matches.map(t => ({ symbol: t.symbol, blockchain: t.blockchain })),
      });
    }
    
    return matches[0];
  }

  /**
   * Helper: Get token price in USD
   */
  async getTokenPrice(symbol: string): Promise<number | null> {
    const token = await this.findTokenBySymbol(symbol);
    return token ? parseFloat(token.price) : null;
  }

  /**
   * Helper: Check if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getSupportedTokens();
      return true;
    } catch (error) {
      logger.error('NEAR Intents health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const nearIntentsClient = new NEARIntentsClient();

export default nearIntentsClient;

