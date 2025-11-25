// Core type definitions for the Crypto Index Rebalancer

export type RebalancingMethod = 'NONE' | 'DAILY' | 'DRIFT' | 'HYBRID';
export type IndexStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'DELETED';
export type TradeType = 'BUY' | 'SELL';
export type TradeAction = 'BUY' | 'SELL';
export type TradeStatus = 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
export type RebalanceStatus = 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
export type Chain = 'ethereum' | 'solana' | 'near' | 'bitcoin';

// User
export interface User {
  userId: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

// Account
export interface Account {
  accountId: string;
  userId: string;
  name: string;
  walletAddress: string;
  encryptedPrivateKey: string;
  depositAddresses: DepositAddresses;
  createdAt: string;
}

export interface DepositAddresses {
  ethereum?: string;
  solana?: string;
  near?: string;
  bitcoin?: string;
}

// Asset Allocation
export interface AssetAllocation {
  symbol: string;
  chain?: Chain;
  percentage: number;
}

export interface CurrentAllocation extends AssetAllocation {
  value: number;
  drift: number;
}

// Rebalancing Configuration
export interface RebalancingConfig {
  method: RebalancingMethod;
  driftThreshold: number; // percentage
  minRebalanceInterval: string; // e.g., "24h"
  maxRebalanceInterval?: string; // e.g., "7d" (for hybrid)
}

// Risk Configuration
export interface RiskConfig {
  maxSlippage: number; // percentage
  maxTradeSize: number; // USD
}

// Index
export interface Index {
  indexId: string;
  accountId: string;
  name: string;
  description?: string;
  status: IndexStatus;
  targetAllocation: AssetAllocation[];
  currentAllocation: CurrentAllocation[] | null;
  totalValue: number;
  totalDrift: number;
  rebalancingConfig: RebalancingConfig;
  riskConfig: RiskConfig;
  lastRebalance: string | null;
  nextRebalanceCheck: string | null;
  createdAt: string;
  updatedAt: string;
}

// Trade
export interface Trade {
  tradeId: string;
  indexId: string;
  rebalanceId?: string;
  type: TradeType;
  action: TradeAction;
  fromAsset: string;
  toAsset: string;
  amount: number;
  executedPrice?: number;
  status: TradeStatus;
  nearDepositAddress?: string;
  nearTxHash?: string;
  retryAttempt: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// Rebalance
export interface Rebalance {
  rebalanceId: string;
  indexId: string;
  reason: string;
  totalDrift: number;
  status: RebalanceStatus;
  tradesCount: number;
  completedTradesCount: number;
  cost: number;
  duration?: number; // seconds
  createdAt: string;
  completedAt?: string;
}

// Webhook
export interface Webhook {
  webhookId: string;
  userId: string;
  url: string;
  events: string[];
  description?: string;
  secret: string;
  active: boolean;
  failureCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Performance Metrics
export interface PerformanceMetrics {
  since_inception: number;
  '1d'?: number;
  '7d'?: number;
  '30d'?: number;
  '90d'?: number;
  '1y'?: number;
}

export interface RiskMetrics {
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface IndexPerformance {
  indexId: string;
  returns: PerformanceMetrics;
  risk: RiskMetrics;
  totalValue: number;
  totalInvested: number;
  totalProfit: number;
  totalProfitPercent: number;
}

// Drift Information
export interface AssetDrift {
  symbol: string;
  target: number;
  current: number;
  drift: number;
  action: 'buy' | 'sell' | 'none';
  amount: number;
}

export interface DriftInfo {
  indexId: string;
  totalDrift: number;
  assets: AssetDrift[];
  needsRebalance: boolean;
  thresholdExceeded: boolean;
  driftThreshold: number;
  nextCheck: string;
}

// Price Information
export interface AssetPrice {
  symbol: string;
  price: number;
  timestamp: string;
}

// NEAR Intents Types
export interface NEARIntentsQuote {
  depositAddress: string;
  estimatedOutput: number;
  estimatedFee: number;
  estimatedSlippage: number;
  expiresAt: string;
}

export interface NEARIntentsSwapStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  error?: string;
}

// Wallet
export interface Wallet {
  address: string;
  privateKey: string;
  publicKey?: string;
  mnemonic?: string;
}

// NEAR Intents Supported Token (re-export from nearIntentsTypes)
export interface SupportedToken {
  assetId: string;
  symbol: string;
  blockchain: string;
  decimals: number;
  price?: number;
  icon?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

