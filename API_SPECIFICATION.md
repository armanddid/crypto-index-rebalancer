# Crypto Index Rebalancer - API Specification

## Overview

REST API for creating and managing crypto index funds with automatic rebalancing using NEAR Intents for cross-chain trading.

**Base URL**: `http://localhost:3000/api` (development)

**Authentication**: JWT Bearer tokens + API Keys

---

## Core Features

- **Multi-user support** with authentication
- **Account management** with EVM wallet generation
- **Index creation** with custom asset allocation
- **Automatic rebalancing** (drift-based, time-based, or hybrid)
- **Cross-chain trading** via NEAR Intents 1Click API
- **Real-time monitoring** with drift calculation
- **Performance analytics** and trade history
- **Webhooks** for event notifications

---

## Authentication

### Register User
```
POST /api/auth/register
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "userId": "usr_abc123",
  "email": "user@example.com",
  "token": "jwt_token_here"
}
```

### Login
```
POST /api/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "userId": "usr_abc123",
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

### Get Current User
```
GET /api/auth/me
Authorization: Bearer {token}
```

---

## Account Management

### Create Trading Account
```
POST /api/accounts
Authorization: Bearer {token}
```

**Request:**
```json
{
  "name": "My Trading Account",
  "email": "notifications@example.com"
}
```

**Response:**
```json
{
  "accountId": "acc_xyz789",
  "userId": "usr_abc123",
  "name": "My Trading Account",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "depositAddresses": {
    "ethereum": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "solana": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "near": "trading.near",
    "bitcoin": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
  },
  "createdAt": "2024-11-24T10:00:00Z"
}
```

### Get Account Details
```
GET /api/accounts/:accountId
Authorization: Bearer {token}
```

### Get Account Balance
```
GET /api/accounts/:accountId/balance
Authorization: Bearer {token}
```

**Response:**
```json
{
  "accountId": "acc_xyz789",
  "balances": {
    "ethereum": {
      "USDC": { "amount": 10000, "usdValue": 10000 },
      "ETH": { "amount": 2.5, "usdValue": 7500 }
    },
    "solana": {
      "SOL": { "amount": 50, "usdValue": 5000 }
    }
  },
  "totalUsdValue": 22500
}
```

---

## Deposit Management

### Generate Deposit Address
```
POST /api/deposits/:accountId/address
```

**Purpose**: Generate a deposit address for funding the user's INTENTS account. The deposited asset will automatically convert to USDC in INTENTS.

**Authentication**: Required (JWT)

**Request:**
```json
{
  "asset": "ETH",
  "blockchain": "eth",
  "amount": "100000000000000000"
}
```

**Parameters:**
- `asset` (string, required): Asset symbol (e.g., "ETH", "SOL", "BTC")
- `blockchain` (string, required): Blockchain identifier (e.g., "eth", "sol", "btc")
- `amount` (string, required): Amount in smallest unit (wei for ETH, lamports for SOL, etc.)

**Response:**
```json
{
  "depositAddress": "0x4BEA4377Eb2cbB1a85F3E99AEA02ebf159718D0B",
  "depositMemo": null,
  "asset": "ETH",
  "blockchain": "eth",
  "amount": "0.1",
  "amountRaw": "100000000000000000",
  "destinationAsset": "USDC",
  "destinationChain": "INTENTS",
  "estimatedOutput": "296.627208",
  "estimatedOutputUsd": "296.2320",
  "deadline": "2025-11-25T23:19:39.193Z",
  "expiresIn": 86400,
  "timeEstimate": 45,
  "intentsAccount": "0xe6bb454473c73335b1739dd60f103ce29dce0f60",
  "instructions": {
    "step1": "Send exactly 0.1 ETH to the deposit address",
    "step2": "Funds will be automatically converted to USDC in your INTENTS account",
    "step3": "Estimated to receive 296.627208 USDC",
    "step4": "Deposit address expires at 2025-11-25T23:19:39.193Z"
  }
}
```

**Notes:**
- Each request generates a unique deposit address
- Deposit address is valid for ~24 hours
- Funds are automatically converted to USDC in INTENTS account
- User must send the exact amount specified
- Conversion happens automatically upon deposit detection

### Get Supported Assets
```
GET /api/deposits/supported-assets
```

**Purpose**: List all assets supported for deposits

**Authentication**: Required (JWT)

**Response:**
```json
{
  "totalAssets": 120,
  "blockchains": ["eth", "sol", "btc", "near", ...],
  "assetsByChain": {
    "eth": [
      {
        "symbol": "ETH",
        "assetId": "nep141:eth.omft.near",
        "decimals": 18,
        "price": "2959.50",
        "contractAddress": null
      },
      {
        "symbol": "USDC",
        "assetId": "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        "decimals": 6,
        "price": "1.00",
        "contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
      }
    ],
    "sol": [...],
    ...
  }
}
```

---

## Index Management

### Create Index
```
POST /api/indices
Authorization: Bearer {token}
```

**Request:**
```json
{
  "accountId": "acc_xyz789",
  "name": "DeFi Index",
  "description": "Top 5 DeFi protocols",
  "assets": [
    {
      "symbol": "UNI",
      "chain": "ethereum",
      "percentage": 40
    },
    {
      "symbol": "AAVE",
      "chain": "ethereum",
      "percentage": 30
    },
    {
      "symbol": "MKR",
      "chain": "ethereum",
      "percentage": 20
    },
    {
      "symbol": "COMP",
      "chain": "ethereum",
      "percentage": 10
    }
  ],
  "rebalancingConfig": {
    "method": "drift_based",
    "driftThreshold": 5,
    "minRebalanceInterval": "24h",
    "maxRebalanceInterval": "7d"
  },
  "riskConfig": {
    "maxSlippage": 1,
    "maxTradeSize": 10000
  }
}
```

**Rebalancing Methods:**
- `none`: No automatic rebalancing
- `daily`: Rebalance once per day if drift threshold met
- `drift_based`: Rebalance when drift exceeds threshold
- `hybrid`: Rebalance on drift OR max interval (whichever comes first)

**Response:**
```json
{
  "indexId": "idx_def456",
  "accountId": "acc_xyz789",
  "name": "DeFi Index",
  "status": "pending_funding",
  "targetAllocation": [
    { "symbol": "UNI", "percentage": 40 },
    { "symbol": "AAVE", "percentage": 30 },
    { "symbol": "MKR", "percentage": 20 },
    { "symbol": "COMP", "percentage": 10 }
  ],
  "currentAllocation": null,
  "totalValue": 0,
  "rebalancingConfig": {...},
  "createdAt": "2024-11-24T10:00:00Z"
}
```

### List Indices
```
GET /api/indices?accountId=acc_xyz789&status=active
Authorization: Bearer {token}
```

**Query Parameters:**
- `accountId` (optional): Filter by account
- `status` (optional): Filter by status (`pending_funding`, `active`, `paused`, `stopped`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

### Get Index Details
```
GET /api/indices/:indexId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "indexId": "idx_def456",
  "accountId": "acc_xyz789",
  "name": "DeFi Index",
  "description": "Top 5 DeFi protocols",
  "status": "active",
  "targetAllocation": [...],
  "currentAllocation": [
    {
      "symbol": "UNI",
      "percentage": 42.5,
      "value": 4250,
      "drift": 2.5
    },
    {
      "symbol": "AAVE",
      "percentage": 28.0,
      "value": 2800,
      "drift": -2.0
    },
    {
      "symbol": "MKR",
      "percentage": 20.5,
      "value": 2050,
      "drift": 0.5
    },
    {
      "symbol": "COMP",
      "percentage": 9.0,
      "value": 900,
      "drift": -1.0
    }
  ],
  "totalValue": 10000,
  "totalDrift": 3.0,
  "performance": {
    "since_inception": 15.3,
    "24h": 2.1,
    "7d": 8.5,
    "30d": 12.3
  },
  "rebalancingConfig": {...},
  "lastRebalance": "2024-11-20T10:00:00Z",
  "nextRebalanceCheck": "2024-11-25T10:00:00Z",
  "createdAt": "2024-11-24T10:00:00Z",
  "updatedAt": "2024-11-24T15:30:00Z"
}
```

### Update Index
```
PATCH /api/indices/:indexId
Authorization: Bearer {token}
```

**Request (partial update):**
```json
{
  "name": "Updated DeFi Index",
  "rebalancingConfig": {
    "driftThreshold": 3
  }
}
```

### Delete Index
```
DELETE /api/indices/:indexId?liquidate=true
Authorization: Bearer {token}
```

**Query Parameters:**
- `liquidate` (optional): If true, sells all assets to USDC before deleting

---

## Index Operations

### Fund Index (Initial or Additional)
```
POST /api/indices/:indexId/deposit
Authorization: Bearer {token}
```

**Request:**
```json
{
  "amount": 10000,
  "sourceChain": "ethereum",
  "sourceAsset": "USDC",
  "autoInvest": true
}
```

**Behavior:**
- If `autoInvest: true`: Immediately buys assets to match target allocation
- If `autoInvest: false`: Holds as USDC, waits for next rebalance

**Response:**
```json
{
  "depositId": "dep_123",
  "indexId": "idx_def456",
  "amount": 10000,
  "status": "processing",
  "trades": [
    {
      "tradeId": "trd_001",
      "from": "USDC",
      "to": "UNI",
      "amount": 4000,
      "status": "pending"
    },
    {
      "tradeId": "trd_002",
      "from": "USDC",
      "to": "AAVE",
      "amount": 3000,
      "status": "pending"
    },
    {
      "tradeId": "trd_003",
      "from": "USDC",
      "to": "MKR",
      "amount": 2000,
      "status": "pending"
    },
    {
      "tradeId": "trd_004",
      "from": "USDC",
      "to": "COMP",
      "amount": 1000,
      "status": "pending"
    }
  ],
  "createdAt": "2024-11-24T10:00:00Z"
}
```

### Withdraw from Index
```
POST /api/indices/:indexId/withdraw
Authorization: Bearer {token}
```

**Request:**
```json
{
  "amount": 2500,
  "targetChain": "ethereum",
  "targetAsset": "USDC",
  "partial": true
}
```

**Behavior:**
- Sells assets proportionally (based on current allocation)
- Aggregates to USDC
- Sends to user's wallet on target chain

**Response:**
```json
{
  "withdrawalId": "wth_456",
  "indexId": "idx_def456",
  "amount": 2500,
  "status": "processing",
  "trades": [
    {
      "tradeId": "trd_005",
      "from": "UNI",
      "to": "USDC",
      "amount": 1062.50,
      "status": "pending"
    },
    {
      "tradeId": "trd_006",
      "from": "AAVE",
      "to": "USDC",
      "amount": 700,
      "status": "pending"
    },
    {
      "tradeId": "trd_007",
      "from": "MKR",
      "to": "USDC",
      "amount": 512.50,
      "status": "pending"
    },
    {
      "tradeId": "trd_008",
      "from": "COMP",
      "to": "USDC",
      "amount": 225,
      "status": "pending"
    }
  ],
  "createdAt": "2024-11-24T11:00:00Z"
}
```

### Trigger Rebalance
```
POST /api/indices/:indexId/rebalance
Authorization: Bearer {token}
```

**Request:**
```json
{
  "force": false,
  "dryRun": false
}
```

**Parameters:**
- `force`: If true, ignore drift threshold and rebalance anyway
- `dryRun`: If true, simulate without executing trades

**Response:**
```json
{
  "rebalanceId": "reb_789",
  "indexId": "idx_def456",
  "status": "executing",
  "reason": "drift_threshold_exceeded",
  "totalDrift": 5.2,
  "trades": [
    {
      "tradeId": "trd_009",
      "action": "sell",
      "asset": "UNI",
      "amount": 250,
      "reason": "overweight by 2.5%",
      "status": "pending"
    },
    {
      "tradeId": "trd_010",
      "action": "buy",
      "asset": "AAVE",
      "amount": 200,
      "reason": "underweight by 2.0%",
      "status": "pending"
    },
    {
      "tradeId": "trd_011",
      "action": "buy",
      "asset": "COMP",
      "amount": 100,
      "reason": "underweight by 1.0%",
      "status": "pending"
    }
  ],
  "estimatedCost": {
    "tradingFees": 5.50,
    "slippage": 2.30,
    "gasFees": 0,
    "total": 7.80
  },
  "createdAt": "2024-11-24T12:00:00Z"
}
```

**Trade Execution Strategy:**
1. Calculate required trades
2. Get quotes from NEAR Intents for all trades (parallel)
3. Execute trades in parallel
4. Monitor each trade independently
5. Retry failed trades (up to 2 retries)
6. Update index allocation after all trades complete

### Pause Index
```
POST /api/indices/:indexId/pause
Authorization: Bearer {token}
```

**Response:**
```json
{
  "indexId": "idx_def456",
  "status": "paused",
  "message": "Automatic rebalancing paused. Monitoring continues."
}
```

### Resume Index
```
POST /api/indices/:indexId/resume
Authorization: Bearer {token}
```

### Stop Index
```
POST /api/indices/:indexId/stop
Authorization: Bearer {token}
```

**Behavior:**
- Stops monitoring and rebalancing
- Keeps positions (no liquidation)
- Can be resumed later

### Liquidate Index
```
POST /api/indices/:indexId/liquidate
Authorization: Bearer {token}
```

**Request:**
```json
{
  "targetAsset": "USDC",
  "targetChain": "ethereum"
}
```

**Behavior:**
- Sells all assets
- Converts to target asset (USDC)
- Keeps in account (doesn't withdraw)

---

## Monitoring & Analytics

### Get Current Drift
```
GET /api/indices/:indexId/drift
Authorization: Bearer {token}
```

**Response:**
```json
{
  "indexId": "idx_def456",
  "totalDrift": 3.2,
  "assets": [
    {
      "symbol": "UNI",
      "target": 40,
      "current": 42.5,
      "drift": 2.5,
      "action": "sell",
      "amount": 250
    },
    {
      "symbol": "AAVE",
      "target": 30,
      "current": 28.0,
      "drift": -2.0,
      "action": "buy",
      "amount": 200
    },
    {
      "symbol": "MKR",
      "target": 20,
      "current": 20.5,
      "drift": 0.5,
      "action": "none",
      "amount": 0
    },
    {
      "symbol": "COMP",
      "target": 10,
      "current": 9.0,
      "drift": -1.0,
      "action": "buy",
      "amount": 100
    }
  ],
  "needsRebalance": false,
  "thresholdExceeded": false,
  "driftThreshold": 5.0,
  "nextCheck": "2024-11-25T10:00:00Z"
}
```

### Get Performance Metrics
```
GET /api/indices/:indexId/performance
Authorization: Bearer {token}
```

**Response:**
```json
{
  "indexId": "idx_def456",
  "returns": {
    "since_inception": 15.3,
    "1d": 2.1,
    "7d": 8.5,
    "30d": 12.3,
    "90d": 25.7,
    "1y": null
  },
  "risk": {
    "volatility": 28.5,
    "maxDrawdown": -15.2,
    "sharpeRatio": 1.2
  },
  "benchmark": {
    "name": "BTC",
    "returns": {
      "since_inception": 12.1,
      "1d": 1.5,
      "7d": 6.2,
      "30d": 10.1
    }
  },
  "totalValue": 11530,
  "totalInvested": 10000,
  "totalProfit": 1530,
  "totalProfitPercent": 15.3
}
```

### Get Rebalancing History
```
GET /api/indices/:indexId/rebalances?page=1&limit=10
Authorization: Bearer {token}
```

**Response:**
```json
{
  "indexId": "idx_def456",
  "rebalances": [
    {
      "rebalanceId": "reb_789",
      "timestamp": "2024-11-20T10:00:00Z",
      "reason": "drift_threshold_exceeded",
      "totalDrift": 5.2,
      "trades": [...],
      "cost": 7.80,
      "status": "completed",
      "duration": 45
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

### Get Trade History
```
GET /api/indices/:indexId/trades?page=1&limit=20
Authorization: Bearer {token}
```

**Response:**
```json
{
  "indexId": "idx_def456",
  "trades": [
    {
      "tradeId": "trd_009",
      "type": "rebalance",
      "action": "sell",
      "fromAsset": "UNI",
      "toAsset": "USDC",
      "amount": 250,
      "executedPrice": 10.50,
      "status": "completed",
      "nearTxHash": "0x123...",
      "createdAt": "2024-11-20T10:00:00Z",
      "completedAt": "2024-11-20T10:00:45Z"
    },
    ...
  ],
  "pagination": {...}
}
```

---

## Webhooks

### Register Webhook
```
POST /api/webhooks
Authorization: Bearer {token}
```

**Request:**
```json
{
  "url": "https://your-app.com/webhooks/index",
  "events": [
    "index.rebalanced",
    "index.drift_threshold",
    "index.trade_completed",
    "index.trade_failed",
    "index.deposit_completed",
    "index.withdrawal_completed"
  ],
  "secret": "your_webhook_secret"
}
```

### List Webhooks
```
GET /api/webhooks
Authorization: Bearer {token}
```

### Delete Webhook
```
DELETE /api/webhooks/:webhookId
Authorization: Bearer {token}
```

---

## System & Health

### Health Check
```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-24T10:00:00Z",
  "services": {
    "database": "healthy",
    "nearIntents": "healthy",
    "priceOracle": "healthy"
  }
}
```

### System Status
```
GET /api/status
```

**Response:**
```json
{
  "version": "1.0.0",
  "uptime": 86400,
  "activeIndices": 25,
  "totalUsers": 10,
  "totalValue": 250000,
  "services": {
    "nearIntents": {
      "status": "operational",
      "latency": 150
    },
    "priceOracle": {
      "status": "operational",
      "lastUpdate": "2024-11-24T09:59:00Z"
    }
  }
}
```

### Get Supported Assets
```
GET /api/supported-assets
```

**Response:**
```json
{
  "assets": [
    {
      "symbol": "BTC",
      "name": "Bitcoin",
      "chains": ["bitcoin", "ethereum"],
      "minTradeSize": 0.0001,
      "tradingFee": 0.1
    },
    {
      "symbol": "ETH",
      "name": "Ethereum",
      "chains": ["ethereum"],
      "minTradeSize": 0.001,
      "tradingFee": 0.1
    },
    ...
  ]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  },
  "timestamp": "2024-11-24T10:00:00Z"
}
```

**Common Error Codes:**
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (external service down)

---

## Rate Limiting

- **Authenticated requests**: 1000 requests/hour
- **Unauthenticated requests**: 100 requests/hour
- **Trade operations**: 10 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1732449600
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Webhook Events

### Event: `index.rebalanced`
```json
{
  "event": "index.rebalanced",
  "timestamp": "2024-11-24T10:00:00Z",
  "data": {
    "indexId": "idx_def456",
    "rebalanceId": "reb_789",
    "reason": "drift_threshold_exceeded",
    "totalDrift": 5.2,
    "tradesExecuted": 3,
    "cost": 7.80,
    "status": "completed"
  }
}
```

### Event: `index.drift_threshold`
```json
{
  "event": "index.drift_threshold",
  "timestamp": "2024-11-24T10:00:00Z",
  "data": {
    "indexId": "idx_def456",
    "totalDrift": 5.1,
    "threshold": 5.0,
    "message": "Drift threshold exceeded. Rebalancing recommended."
  }
}
```

### Event: `index.trade_completed`
```json
{
  "event": "index.trade_completed",
  "timestamp": "2024-11-24T10:00:45Z",
  "data": {
    "indexId": "idx_def456",
    "tradeId": "trd_009",
    "fromAsset": "UNI",
    "toAsset": "USDC",
    "amount": 250,
    "nearTxHash": "0x123..."
  }
}
```

### Event: `index.trade_failed`
```json
{
  "event": "index.trade_failed",
  "timestamp": "2024-11-24T10:01:00Z",
  "data": {
    "indexId": "idx_def456",
    "tradeId": "trd_010",
    "error": "Insufficient liquidity",
    "retryAttempt": 1,
    "maxRetries": 2
  }
}
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All monetary amounts are in USD unless specified
- Gas fees are included in NEAR Intents quotes (no separate gas fee field)
- Trades execute in parallel for better performance
- Failed trades retry up to 2 times with exponential backoff
- Base currency for rebalancing is USDC

