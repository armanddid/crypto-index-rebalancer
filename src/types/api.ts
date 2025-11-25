// API Request and Response types

import {
  AssetAllocation,
  CurrentAllocation,
  RebalancingConfig,
  RiskConfig,
  Trade,
  Rebalance,
  PerformanceMetrics,
  RiskMetrics,
  AssetDrift,
  PaginationResult,
  Chain,
} from './index.js';

// ============================================================================
// Authentication
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export interface GetUserResponse {
  userId: string;
  email: string;
  name: string;
  createdAt: string;
}

// ============================================================================
// Accounts
// ============================================================================

export interface CreateAccountRequest {
  name: string;
  email?: string;
}

export interface CreateAccountResponse {
  accountId: string;
  userId: string;
  name: string;
  walletAddress: string;
  depositAddresses: {
    ethereum?: string;
    solana?: string;
    near?: string;
    bitcoin?: string;
  };
  createdAt: string;
}

export interface GetAccountResponse {
  accountId: string;
  userId: string;
  name: string;
  walletAddress: string;
  depositAddresses: {
    ethereum?: string;
    solana?: string;
    near?: string;
    bitcoin?: string;
  };
  createdAt: string;
}

export interface GetAccountBalanceResponse {
  accountId: string;
  balances: {
    [chain: string]: {
      [asset: string]: {
        amount: number;
        usdValue: number;
      };
    };
  };
  totalUsdValue: number;
}

// ============================================================================
// Indices
// ============================================================================

export interface CreateIndexRequest {
  accountId: string;
  name: string;
  description?: string;
  assets: AssetAllocation[];
  rebalancingConfig: RebalancingConfig;
  riskConfig: RiskConfig;
}

export interface CreateIndexResponse {
  indexId: string;
  accountId: string;
  name: string;
  description?: string;
  status: string;
  targetAllocation: AssetAllocation[];
  currentAllocation: CurrentAllocation[] | null;
  totalValue: number;
  rebalancingConfig: RebalancingConfig;
  riskConfig: RiskConfig;
  createdAt: string;
}

export interface ListIndicesQuery {
  accountId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ListIndicesResponse {
  indices: CreateIndexResponse[];
  pagination: PaginationResult;
}

export interface GetIndexResponse {
  indexId: string;
  accountId: string;
  name: string;
  description?: string;
  status: string;
  targetAllocation: AssetAllocation[];
  currentAllocation: CurrentAllocation[];
  totalValue: number;
  totalDrift: number;
  performance: {
    since_inception: number;
    '24h': number;
    '7d': number;
    '30d': number;
  };
  rebalancingConfig: RebalancingConfig;
  riskConfig: RiskConfig;
  lastRebalance: string | null;
  nextRebalanceCheck: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateIndexRequest {
  name?: string;
  description?: string;
  targetAllocation?: AssetAllocation[];
  rebalancingConfig?: Partial<RebalancingConfig>;
  riskConfig?: Partial<RiskConfig>;
}

export interface UpdateIndexResponse extends GetIndexResponse {}

export interface DeleteIndexQuery {
  liquidate?: boolean;
}

export interface DeleteIndexResponse {
  message: string;
  indexId: string;
}

// ============================================================================
// Index Operations
// ============================================================================

export interface DepositRequest {
  amount: number;
  sourceChain: Chain;
  sourceAsset: string;
  autoInvest: boolean;
}

export interface DepositResponse {
  depositId: string;
  indexId: string;
  amount: number;
  status: string;
  trades: Array<{
    tradeId: string;
    from: string;
    to: string;
    amount: number;
    status: string;
  }>;
  createdAt: string;
}

export interface WithdrawRequest {
  amount: number;
  targetChain: Chain;
  targetAsset: string;
  partial: boolean;
}

export interface WithdrawResponse {
  withdrawalId: string;
  indexId: string;
  amount: number;
  status: string;
  trades: Array<{
    tradeId: string;
    from: string;
    to: string;
    amount: number;
    status: string;
  }>;
  createdAt: string;
}

export interface RebalanceRequest {
  force?: boolean;
  dryRun?: boolean;
}

export interface RebalanceResponse {
  rebalanceId: string;
  indexId: string;
  status: string;
  reason: string;
  totalDrift: number;
  trades: Array<{
    tradeId: string;
    action: string;
    asset: string;
    amount: number;
    reason: string;
    status: string;
  }>;
  estimatedCost: {
    tradingFees: number;
    slippage: number;
    gasFees: number;
    total: number;
  };
  createdAt: string;
}

export interface PauseIndexResponse {
  indexId: string;
  status: string;
  message: string;
}

export interface ResumeIndexResponse {
  indexId: string;
  status: string;
  message: string;
}

export interface StopIndexResponse {
  indexId: string;
  status: string;
  message: string;
}

export interface LiquidateRequest {
  targetAsset: string;
  targetChain: Chain;
}

export interface LiquidateResponse {
  indexId: string;
  status: string;
  trades: Trade[];
  message: string;
}

// ============================================================================
// Monitoring & Analytics
// ============================================================================

export interface GetDriftResponse {
  indexId: string;
  totalDrift: number;
  assets: AssetDrift[];
  needsRebalance: boolean;
  thresholdExceeded: boolean;
  driftThreshold: number;
  nextCheck: string;
}

export interface GetPerformanceResponse {
  indexId: string;
  returns: PerformanceMetrics;
  risk: RiskMetrics;
  benchmark?: {
    name: string;
    returns: PerformanceMetrics;
  };
  totalValue: number;
  totalInvested: number;
  totalProfit: number;
  totalProfitPercent: number;
}

export interface GetRebalancesQuery {
  page?: number;
  limit?: number;
}

export interface GetRebalancesResponse {
  indexId: string;
  rebalances: Rebalance[];
  pagination: PaginationResult;
}

export interface GetTradesQuery {
  page?: number;
  limit?: number;
}

export interface GetTradesResponse {
  indexId: string;
  trades: Trade[];
  pagination: PaginationResult;
}

// ============================================================================
// Webhooks
// ============================================================================

export interface RegisterWebhookRequest {
  url: string;
  events: string[];
  secret: string;
}

export interface RegisterWebhookResponse {
  webhookId: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export interface ListWebhooksResponse {
  webhooks: RegisterWebhookResponse[];
}

export interface DeleteWebhookResponse {
  message: string;
  webhookId: string;
}

// ============================================================================
// System
// ============================================================================

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  services: {
    database: string;
    nearIntents: string;
    priceOracle: string;
  };
}

export interface SystemStatusResponse {
  version: string;
  uptime: number;
  activeIndices: number;
  totalUsers: number;
  totalValue: number;
  services: {
    nearIntents: {
      status: string;
      latency: number;
    };
    priceOracle: {
      status: string;
      lastUpdate: string;
    };
  };
}

export interface SupportedAsset {
  symbol: string;
  name: string;
  chains: Chain[];
  minTradeSize: number;
  tradingFee: number;
}

export interface GetSupportedAssetsResponse {
  assets: SupportedAsset[];
}

// ============================================================================
// Error Response
// ============================================================================

export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
}

