// NEAR Intents 1Click API type definitions
// Based on: https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api

export type SwapType = 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'ANY_INPUT';
export type DepositMode = 'SIMPLE' | 'MEMO';
export type DepositType = 'ORIGIN_CHAIN' | 'VIRTUAL_CHAIN' | 'INTENTS';
export type RecipientType = 'DESTINATION_CHAIN' | 'VIRTUAL_CHAIN' | 'INTENTS';
export type RefundType = 'ORIGIN_CHAIN' | 'VIRTUAL_CHAIN' | 'INTENTS';

export type SwapStatus = 
  | 'PENDING_DEPOSIT' 
  | 'PROCESSING' 
  | 'SUCCESS' 
  | 'INCOMPLETE_DEPOSIT' 
  | 'REFUNDED' 
  | 'FAILED';

// Supported Token
export interface SupportedToken {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
  price: string;
  priceUpdatedAt: string;
  contractAddress?: string;
}

// Quote Request
export interface QuoteRequest {
  dry: boolean;
  depositMode?: DepositMode;
  swapType: SwapType;
  slippageTolerance: number; // basis points (e.g., 100 = 1%)
  originAsset: string;
  depositType?: DepositType;
  destinationAsset: string;
  amount: string;
  refundTo: string;
  refundType?: RefundType;
  recipient: string;
  recipientType?: RecipientType;
  connectedWallets?: string[];
  sessionId?: string;
  virtualChainRecipient?: string;
  virtualChainRefundRecipient?: string;
  customRecipientMsg?: string;
  deadline?: string;
  referral?: string;
  quoteWaitingTimeMs?: number;
  appFees?: Array<{
    recipient: string;
    fee: number;
  }>;
}

// Quote Response
export interface Quote {
  depositAddress: string;
  depositMemo?: string;
  amountIn: string;
  amountInFormatted: string;
  amountInUsd: string;
  minAmountIn?: string;
  amountOut: string;
  amountOutFormatted: string;
  amountOutUsd: string; // NOTE: For display only, not for calculations!
  minAmountOut?: string;
  deadline: string;
  timeWhenInactive: string;
  timeEstimate: number; // seconds
  virtualChainRecipient?: string;
  virtualChainRefundRecipient?: string;
  customRecipientMsg?: string;
}

export interface QuoteResponse {
  timestamp: string;
  signature: string;
  quoteRequest: QuoteRequest;
  quote: Quote;
}

// Deposit Submission
export interface DepositSubmitRequest {
  depositAddress: string;
  depositMemo?: string;
  txHash: string;
}

export interface DepositSubmitResponse {
  success: boolean;
  message?: string;
}

// Swap Status
export interface TransactionHash {
  hash: string;
  explorerUrl: string;
}

export interface SwapDetails {
  intentHashes?: string[];
  nearTxHashes?: string[];
  amountIn?: string;
  amountInFormatted?: string;
  amountInUsd?: string;
  amountOut?: string;
  amountOutFormatted?: string;
  amountOutUsd?: string;
  slippage?: number;
  originChainTxHashes?: TransactionHash[];
  destinationChainTxHashes?: TransactionHash[];
  refundedAmount?: string;
  refundedAmountFormatted?: string;
  refundedAmountUsd?: string;
  depositedAmount?: string;
  depositedAmountFormatted?: string;
  depositedAmountUsd?: string;
  referral?: string;
}

export interface SwapStatusResponse {
  quoteResponse: QuoteResponse;
  status: SwapStatus;
  updatedAt: string;
  swapDetails?: SwapDetails;
}

// Error Response
export interface NEARIntentsError {
  error: string;
  message: string;
  statusCode?: number;
}

