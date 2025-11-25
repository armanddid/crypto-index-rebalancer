# INTENTS Balance Tracking Solution

## Problem
The NEAR Intents contract (`intents.near`) does not expose a public method to query account balances directly. We need to know which tokens (especially which USDC variant) are available before rebalancing.

## Current Situation
- ✅ We successfully executed a swap with **Base USDC** (`nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near`)
- ❌ We cannot query balances directly from the contract
- ❌ The 1-Click API doesn't provide a balance query endpoint

## Solutions

### Solution 1: Track Balances Locally (RECOMMENDED for MVP)
**Approach**: Maintain a local balance cache that updates after each transaction.

**Implementation**:
1. When user deposits funds, record the asset ID and amount
2. After each swap, update local balances based on swap results
3. Before rebalancing, use cached balances to determine available tokens

**Pros**:
- Works immediately without waiting for NEAR Intents API updates
- Fast (no network calls)
- Accurate if all transactions go through our system

**Cons**:
- Requires database to store balances
- Can drift if user makes transactions outside our system
- Needs periodic reconciliation

### Solution 2: Use INTENTS Explorer API (IF AVAILABLE)
**Approach**: The INTENTS Explorer (https://intents.near.org) might have an API to query balances.

**Implementation**:
1. Reverse engineer the Explorer's API calls
2. Use their endpoint to fetch balances
3. Cache results for performance

**Pros**:
- Always accurate
- No local state to manage

**Cons**:
- Unofficial API (might break)
- Rate limiting concerns
- Dependency on third-party service

### Solution 3: Ask User to Specify USDC Type (SIMPLEST for now)
**Approach**: When creating an index, user specifies which USDC they deposited.

**Implementation**:
1. Add `baseAssetId` field to Index model
2. User selects from dropdown: "Base USDC", "Ethereum USDC", "Arbitrum USDC", etc.
3. Use this asset ID for all rebalancing

**Pros**:
- Simplest to implement
- No balance queries needed
- User has full control

**Cons**:
- Manual process
- User needs to know which USDC they have
- Doesn't work if user has multiple USDC types

### Solution 4: Contact NEAR Intents Team (LONG-TERM)
**Approach**: Ask the NEAR Intents team for:
1. The correct contract method to query balances
2. Or a REST API endpoint for balance queries
3. Or documentation on how frontends query balances

**Pros**:
- Official solution
- Future-proof
- Likely most reliable

**Cons**:
- Takes time to get response
- Might not exist yet

## Recommended Implementation Plan

### Phase 1: MVP (Immediate)
Use **Solution 3** - User specifies USDC type when creating index:

```typescript
interface Index {
  // ... existing fields
  baseAssetId: string; // e.g., 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near'
  baseAssetSymbol: string; // e.g., 'USDC (Base)'
}
```

### Phase 2: Enhanced (Short-term)
Add **Solution 1** - Local balance tracking:

```typescript
interface AccountBalance {
  accountId: string;
  assetId: string;
  balance: string;
  lastUpdated: Date;
}
```

Update balances after each:
- Deposit
- Swap (both buy and sell)
- Withdrawal

### Phase 3: Production (Long-term)
Implement **Solution 4** - Official balance query once available from NEAR Intents team.

## Immediate Action Items

1. ✅ **Document the issue** (this file)
2. 🔄 **Update Index model** to include `baseAssetId`
3. 🔄 **Update API** to accept base asset specification
4. 🔄 **Update PortfolioService** to use the specified base asset
5. 📧 **Contact NEAR Intents team** to ask about balance query methods

## Workaround for Testing

For now, we know:
- **Wallet 1** has **Base USDC** (`nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near`)
- **Balance**: ~9 USDC remaining (after 1 USDC test swap)

We can hardcode this for testing and implement proper balance tracking later.

