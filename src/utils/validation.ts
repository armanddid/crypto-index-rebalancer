// Zod validation schemas

import { z } from 'zod';

// ============================================================================
// Authentication Schemas
// ============================================================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================================================
// Account Schemas
// ============================================================================

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address').optional(),
});

// ============================================================================
// Index Schemas
// ============================================================================

const assetAllocationSchema = z.object({
  symbol: z.string().min(1, 'Asset symbol is required').toUpperCase(),
  chain: z.enum(['ethereum', 'solana', 'near', 'bitcoin']),
  percentage: z.number().min(0, 'Percentage must be >= 0').max(100, 'Percentage must be <= 100'),
});

const rebalancingConfigSchema = z.object({
  method: z.enum(['none', 'daily', 'drift_based', 'hybrid']),
  driftThreshold: z.number().min(0, 'Drift threshold must be >= 0').max(100, 'Drift threshold must be <= 100'),
  minRebalanceInterval: z.string().regex(/^\d+[hdm]$/, 'Invalid interval format (e.g., "24h", "7d")'),
  maxRebalanceInterval: z.string().regex(/^\d+[hdm]$/, 'Invalid interval format').optional(),
});

const riskConfigSchema = z.object({
  maxSlippage: z.number().min(0, 'Max slippage must be >= 0').max(100, 'Max slippage must be <= 100'),
  maxTradeSize: z.number().min(0, 'Max trade size must be >= 0'),
});

// Simplified allocation schema (without chain requirement)
const simpleAllocationSchema = z.object({
  symbol: z.string().min(1, 'Asset symbol is required').toUpperCase(),
  percentage: z.number().min(0, 'Percentage must be >= 0').max(100, 'Percentage must be <= 100'),
});

export const createIndexSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  name: z.string().min(1, 'Index name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  allocations: z.array(simpleAllocationSchema).min(1, 'At least one asset is required').max(20, 'Too many assets'),
  rebalancingMethod: z.enum(['NONE', 'DAILY', 'DRIFT', 'HYBRID']).optional(),
  driftThresholdPercent: z.number().min(0).max(100).optional(),
  rebalancingIntervalHours: z.number().min(1).optional(),
}).refine(
  (data) => {
    // Validate that percentages sum to 100
    const total = data.allocations.reduce((sum, asset) => sum + asset.percentage, 0);
    return Math.abs(total - 100) < 0.01; // Allow small floating point errors
  },
  {
    message: 'Asset percentages must sum to 100',
    path: ['allocations'],
  }
).refine(
  (data) => {
    // Validate unique symbols
    const symbols = data.allocations.map(a => a.symbol);
    return symbols.length === new Set(symbols).size;
  },
  {
    message: 'Asset symbols must be unique',
    path: ['allocations'],
  }
);

export const updateIndexSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  rebalancingMethod: z.enum(['NONE', 'DAILY', 'DRIFT', 'HYBRID']).optional(),
  driftThresholdPercent: z.number().min(0).max(100).optional(),
  rebalancingIntervalHours: z.number().min(1).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'DELETED']).optional(),
});

export const listIndicesSchema = z.object({
  accountId: z.string().optional(),
  status: z.enum(['pending_funding', 'active', 'paused', 'stopped']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const deleteIndexSchema = z.object({
  liquidate: z.coerce.boolean().default(false),
});

// ============================================================================
// Index Operations Schemas
// ============================================================================

export const depositSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  sourceChain: z.enum(['ethereum', 'solana', 'near', 'bitcoin']),
  sourceAsset: z.string().min(1, 'Source asset is required').toUpperCase(),
  autoInvest: z.boolean().default(true),
});

export const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  targetChain: z.enum(['ethereum', 'solana', 'near', 'bitcoin']),
  targetAsset: z.string().min(1, 'Target asset is required').toUpperCase(),
  partial: z.boolean().default(true),
});

export const rebalanceSchema = z.object({
  force: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

export const liquidateSchema = z.object({
  targetAsset: z.string().min(1, 'Target asset is required').toUpperCase(),
  targetChain: z.enum(['ethereum', 'solana', 'near', 'bitcoin']),
});

// ============================================================================
// Webhook Schemas
// ============================================================================

export const registerWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  secret: z.string().min(16, 'Secret must be at least 16 characters'),
});

// ============================================================================
// Query Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Helper function to validate request body
// ============================================================================

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

