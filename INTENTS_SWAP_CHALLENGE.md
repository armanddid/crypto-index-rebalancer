# INTENTS-to-INTENTS Swap Challenge

## Current Status: ⚠️ BLOCKED

**Date**: November 25, 2024

---

## Problem Summary

We successfully integrated the NEAR Intents 1Click API for:
- ✅ Getting quotes for swaps
- ✅ Generating deposit addresses for external chain deposits
- ✅ Monitoring swap status for external deposits

However, **INTENTS-to-INTENTS swaps** (swapping assets already in the INTENTS system) do NOT work with the current approach.

---

## What We Tried

### Approach 1: 1Click API with `connectedWallets`
```typescript
const quote = await nearIntentsClient.requestQuote({
  dry: false,
  swapType: 'EXACT_INPUT',
  originAsset: 'nep141:usdc...',
  destinationAsset: 'nep141:btc...',
  amount: '5000000',
  depositType: 'INTENTS',
  recipientType: 'INTENTS',
  connectedWallets: [walletAddress.toLowerCase()],
  // ...
});
```

**Result**: 
- ✅ Quote generated successfully
- ✅ Deposit address returned
- ❌ Swap does NOT execute automatically
- ❌ Monitoring fails with "Deposit address should be not empty"

**Why it fails**: The `connectedWallets` parameter is designed for **frontend wallet connections** (MetaMask, etc.), not backend automation. The API expects a user to sign a transaction through their wallet, which we can't do in a backend context.

### Approach 2: @defuse-protocol/intents-sdk
```typescript
const sdk = new IntentsSDK({
  referral: 'crypto-index-rebalancer',
  intentSigner: createIntentSignerViem({ signer: account }),
});

await sdk.signAndSendIntent({
  intents: [{ intent: "swap", ... }],
});
```

**Result**:
- ❌ SDK doesn't have a "swap" intent type
- ❌ SDK is primarily designed for **withdrawals** from INTENTS to external chains
- ❌ SDK documentation shows it's "unstable" and still under development

**SDK Supported Features**:
- ✅ Withdrawals (INTENTS → External chains)
- ✅ Internal transfers (User A → User B within INTENTS)
- ❌ Swaps (Asset A → Asset B within INTENTS) - **NOT SUPPORTED**

---

## Root Cause

The NEAR Intents ecosystem has two different use cases:

1. **Deposits & Withdrawals** (External ↔ INTENTS)
   - Fully supported by 1Click API
   - Works great for our deposit flow
   - ✅ We successfully tested this with real funds

2. **Internal Swaps** (INTENTS ↔ INTENTS)
   - NOT fully supported by 1Click API for backend use
   - NOT supported by SDK yet
   - Requires either:
     - Frontend wallet integration (not suitable for our backend)
     - Direct protocol interaction (complex, low-level)
     - Wait for SDK to add swap support

---

## Impact on Project

### What Works ✅
- User deposits from any supported chain → INTENTS (USDC)
- Account creation with EVM wallets
- Quote generation for all swap types
- Database and API infrastructure

### What's Blocked ❌
- **Automatic portfolio construction** (can't swap USDC → BTC/ETH in INTENTS)
- **Automatic rebalancing** (can't swap between assets)
- **End-to-end automation** (requires manual intervention)

---

## Possible Solutions

### Option 1: Wait for SDK Update (Recommended)
**Pros**:
- Official, supported solution
- Will be maintained by NEAR team
- Clean, simple integration

**Cons**:
- Unknown timeline
- SDK is marked as "unstable"

**Action**: Contact NEAR Intents team to ask about swap support timeline

### Option 2: Use 1Click API with Frontend Wallet
**Pros**:
- Works today
- Officially supported

**Cons**:
- Requires frontend integration
- Can't be fully automated
- Not suitable for backend-only solution

**Action**: Build a hybrid solution with frontend wallet signing

### Option 3: Direct Protocol Integration
**Pros**:
- Full control
- Can implement any functionality

**Cons**:
- Very complex
- Need to understand NEAR protocol internals
- High maintenance burden
- May break with protocol updates

**Action**: Study NEAR Intents protocol contracts directly

### Option 4: Hybrid Approach (Short-term)
**Pros**:
- Can launch with limited functionality
- Deposits work perfectly
- Can add swaps later

**Cons**:
- Not fully automated
- Requires manual rebalancing

**Action**: 
1. Launch with deposit-only functionality
2. Users deposit USDC to INTENTS
3. Manual portfolio construction using NEAR Intents web interface
4. Our system monitors and suggests rebalancing
5. Add automatic swaps when SDK supports it

---

## Recommendation

**Short-term** (Next 1-2 weeks):
1. Complete the deposit flow (already working)
2. Build portfolio monitoring and drift calculation
3. Generate rebalancing recommendations
4. Provide users with manual rebalancing instructions

**Medium-term** (1-3 months):
1. Contact NEAR Intents team about SDK swap support
2. If timeline is reasonable, wait for SDK update
3. If not, evaluate direct protocol integration

**Long-term**:
1. Full automation with SDK-based swaps
2. End-to-end portfolio management

---

## Next Steps

1. **Document current progress** ✅
2. **Contact NEAR Intents team** about swap support
3. **Decide on approach** based on their response
4. **Update implementation plan** accordingly

---

## Technical Details

### What We Have
- ✅ 10 USDC in test wallet (`0x7c180cACC0b95c160a80Fe1637b0011d651488d4`)
- ✅ Working deposit flow
- ✅ Quote generation for all swap types
- ✅ Database with trade tracking
- ✅ API infrastructure

### What We Need
- ❌ Ability to execute INTENTS-to-INTENTS swaps programmatically
- ❌ Transaction signing for internal INTENTS operations
- ❌ Swap status monitoring for internal swaps

### Test Results
```
✅ External deposit: 0.5 USDC Base → INTENTS (SUCCESS in 20s)
✅ Quote generation: USDC → BTC in INTENTS (SUCCESS)
❌ Swap execution: USDC → BTC in INTENTS (BLOCKED - no SDK support)
```

---

## Contact

**NEAR Intents Team**:
- Documentation: https://docs.near-intents.org
- SDK: https://www.npmjs.com/package/@defuse-protocol/intents-sdk
- GitHub: https://github.com/defuse-protocol

**Questions to Ask**:
1. When will the SDK support INTENTS-to-INTENTS swaps?
2. Is there a workaround for backend automation?
3. Can we use the 1Click API differently for this use case?
4. Are there any examples of backend swap automation?

