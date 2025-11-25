# INTENTS-to-INTENTS Swap Research

## Problem
We need to execute INTENTS-to-INTENTS swaps programmatically for the Index Rebalancer.

## What We Know

### 1. INTENTS Account
- For EVM wallets, the INTENTS account ID is the lowercase EVM address
- Example: `0x7c180cacc0b95c160a80fe1637b0011d651488d4`

### 2. Quote Generation
- ✅ **WORKING**: We can successfully get quotes for INTENTS-to-INTENTS swaps
- Use `depositType: 'INTENTS'`, `refundType: 'INTENTS'`, `recipientType: 'INTENTS'`
- Include `connectedWallets: [accountId]` to indicate we have access to the wallet

### 3. Swap Execution - Three Possible Approaches

#### Approach A: Automatic Execution (Current Test)
**Theory**: When `connectedWallets` is provided and funds exist in INTENTS, the swap executes automatically.

**Status**: 🧪 **TESTING** - Test was interrupted, need to verify if this works

**Code**:
```typescript
// 1. Get quote with connectedWallets
const quote = await nearIntentsClient.requestQuote({
  ...params,
  connectedWallets: [accountId],
});

// 2. Wait for automatic execution
// 3. Monitor status
```

#### Approach B: SDK-Based Signing (`@defuse-protocol/intents-sdk`)
**Theory**: Use the Intents SDK to sign and submit a custom intent.

**Status**: ❌ **BLOCKED** - SDK has dependency issues (`@hot-labs/omni-sdk` module not found)

**Issues**:
- SDK is marked as "unstable" in documentation
- Breaking changes in dependencies
- `SyntaxError: The requested module '@hot-labs/omni-sdk' does not provide an export named 'HotBridge'`

#### Approach C: NEAR Transaction to Deposit Address
**Theory**: Send a NEAR FT transfer to the quote's deposit address.

**Status**: ❌ **FAILED** - NEAR account doesn't exist on-chain

**Issues**:
- EVM-derived NEAR accounts (`0x...`) don't exist on NEAR blockchain by default
- Would need to create the account first (costs NEAR tokens)
- Error: `Can not sign transactions for account 0x7c180cacc0b95c160a80fe1637b0011d651488d4 on network mainnet`

## Resources

### Documentation
- [NEAR Intents Examples](https://github.com/near-examples/near-intents-examples)
- [NEAR Intents Documentation](https://docs.near-intents.org/near-intents/examples)
- [1-Click API Docs](https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api)
- [Defuse Frontend](https://github.com/defuse-protocol/defuse-frontend) - Production implementation

### SDKs
- `@defuse-protocol/one-click-sdk-typescript` - REST API client (auto-generated from OpenAPI)
- `@defuse-protocol/intents-sdk` - Full SDK with signing (currently unstable)

## Key Insight from User

**"When users use the frontend with MetaMask, they sign a transaction. We should do the same from the EVM address."**

This is correct! The question is: **What exactly do they sign?**

### Possible Answers:
1. **EVM signature on the intent data** - Sign the swap parameters with the EVM private key
2. **NEAR transaction** - Convert EVM key to NEAR key and sign a NEAR transaction
3. **Message signature** - Sign a message that authorizes the swap

## Current Blockers

### SDK Dependency Issues
The `@defuse-protocol/intents-sdk` has multiple dependency problems:
- `@hot-labs/omni-sdk` module not found
- `near-api-js/lib/utils/serialize` import errors
- SDK is marked as "unstable" in documentation

### What We Know Works
- ✅ Getting quotes with `connectedWallets`
- ✅ The quote includes a `signature` field (ed25519 signature from the 1-Click API)
- ❌ The swap doesn't execute automatically (status remains `PENDING_DEPOSIT`)

## Next Steps

1. **PRIORITY**: Examine the Defuse Frontend code to see exactly how they sign and submit INTENTS-to-INTENTS swaps
   - Look for EVM signing logic
   - Find where they call the SDK or API
   - Understand the exact flow

2. **Alternative**: Contact NEAR Intents team for:
   - How to execute INTENTS-to-INTENTS swaps programmatically with EVM wallets
   - Whether there's a working version of the SDK
   - API endpoint to submit signed intents

3. **Workaround**: If SDK is truly broken, implement manual signing:
   - Use `viem` to sign the intent data with EVM private key
   - Submit the signed intent to the NEAR Intents contract directly
   - Or find the correct 1-Click API endpoint for signed intent submission

## Test Results

### Test 1: Automatic Execution (Interrupted)
- **Date**: 2025-11-25
- **Wallet**: 0x7c180cACC0b95c160a80Fe1637b0011d651488d4 (10 USDC in INTENTS)
- **Swap**: 1 USDC → BTC
- **Quote**: ✅ Success (depositAddress: `3c4878ae318c7268f5b10e91271ff641a2dd9e3dec397c6d966bb4f022ed6981`)
- **Expected Output**: 0.00001132 BTC
- **Status**: Test was interrupted during status monitoring
- **Next**: Re-run to completion


