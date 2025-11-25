# INTENTS Deposit Flow - Understanding

## Problem
We need to understand how to use `depositType: 'INTENTS'` for rebalancing swaps within the INTENTS virtual account.

## What We Know

### From Testing
1. ✅ `depositType: 'ORIGIN_CHAIN'` works - deposits from external chains
2. ✅ `recipientType: 'DESTINATION_CHAIN'` works - sends to external chains
3. ❌ `recipientType: 'INTENTS'` fails with "recipient is not valid" when using ETH address
4. ❌ `depositType: 'INTENTS'` likely requires funds already in INTENTS balance

### From Documentation
- **INTENTS** is not a blockchain, it's a virtual account/balance system
- The `intents.near` contract holds user funds
- NEAR supports Ethereum-like addresses (e.g., `0x...`)
- Implicit accounts are 64-char hex derived from public key

## Hypothesis

The INTENTS flow works like this:

### Step 1: Initial Deposit (External Chain → INTENTS)
```typescript
{
  depositType: 'ORIGIN_CHAIN',  // From ETH/SOL/etc
  recipientType: 'INTENTS',      // Into INTENTS balance
  recipient: ???                 // NEAR account ID? ETH address?
}
```

### Step 2: Rebalancing (INTENTS → INTENTS)
```typescript
{
  depositType: 'INTENTS',        // From INTENTS balance
  recipientType: 'INTENTS',      // Stay in INTENTS balance
  recipient: ???                 // Same NEAR account ID
}
```

## Questions to Answer

1. **What format should `recipient` be when `recipientType: 'INTENTS'`?**
   - Ethereum address? (`0x...`)
   - NEAR implicit account? (64-char hex)
   - Named NEAR account? (`user.near`)

2. **How do we derive the NEAR account ID from an EVM wallet?**
   - Is it automatic?
   - Do we need to call a specific API?
   - Is it the same as the ETH address?

3. **Do we need to "create" or "register" an INTENTS account first?**
   - Or is it automatic on first deposit?

## Next Steps

1. Contact NEAR Intents support/Discord for clarification
2. Look for SDK examples that use INTENTS mode
3. Try different recipient formats:
   - Lowercase ETH address
   - ETH address without `0x` prefix
   - Check if there's an account lookup API

## Alternative Approach

If INTENTS-to-INTENTS swaps are too complex, we could:
- Use `ORIGIN_CHAIN` → `DESTINATION_CHAIN` for all swaps
- Accept the cross-chain overhead
- Still works, just slower and potentially more expensive

However, this defeats the purpose of using INTENTS for fast rebalancing.

