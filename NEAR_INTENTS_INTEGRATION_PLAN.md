# NEAR Intents 1Click API Integration Plan

## 📚 Overview

Integrating NEAR Intents 1Click API for cross-chain token swaps in the Index Rebalancer.

**Documentation**: https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api

---

## 🎯 Integration Milestones

We'll build and test incrementally to handle the unknowns with NEAR Intents.

### Milestone 1: Basic API Client ✅ NEXT
**Goal**: Connect to NEAR Intents and fetch supported tokens

**Tasks**:
- [ ] Create `src/integrations/nearIntents.ts`
- [ ] Implement `getSupportedTokens()` function
- [ ] Add JWT token support (optional, avoids 0.1% fee)
- [ ] Test: Fetch and display supported tokens

**Test Criteria**:
- ✅ Can fetch list of supported tokens
- ✅ Response includes asset IDs, symbols, prices
- ✅ Error handling works

**Estimated Time**: 1 hour

---

### Milestone 2: Quote Generation (Dry Run) 🔄
**Goal**: Generate swap quotes without executing trades

**Tasks**:
- [ ] Implement `requestQuote()` function
- [ ] Support `dry: true` mode (no deposit address generated)
- [ ] Handle EXACT_INPUT swap type
- [ ] Parse quote response
- [ ] Test: Get quotes for various token pairs

**Test Criteria**:
- ✅ Can request quote for USDC → UNI
- ✅ Can request quote for ETH → SOL
- ✅ Quote includes amountIn, amountOut, slippage
- ✅ Dry run doesn't generate deposit address
- ✅ Error handling for unsupported pairs

**Estimated Time**: 2 hours

---

### Milestone 3: Real Quote with Deposit Address 🔄
**Goal**: Generate actual swap quotes with deposit addresses

**Tasks**:
- [ ] Implement `requestQuote()` with `dry: false`
- [ ] Handle deposit address generation
- [ ] Store quote in database
- [ ] Implement deadline tracking
- [ ] Test: Generate real quotes (small amounts!)

**Test Criteria**:
- ✅ Can generate quote with deposit address
- ✅ Deposit address is unique per quote
- ✅ Deadline is set correctly
- ✅ Quote stored in database
- ✅ Can retrieve quote by deposit address

**Estimated Time**: 2 hours

---

### Milestone 4: Deposit Submission 🔄
**Goal**: Submit deposit transaction hashes to speed up processing

**Tasks**:
- [ ] Implement `submitDepositTx()` function
- [ ] Link deposit tx to quote
- [ ] Test: Submit test transaction hashes

**Test Criteria**:
- ✅ Can submit deposit tx hash
- ✅ 1Click acknowledges submission
- ✅ Error handling for invalid hashes

**Estimated Time**: 1 hour

---

### Milestone 5: Status Monitoring 🔄
**Goal**: Monitor swap execution status

**Tasks**:
- [ ] Implement `getSwapStatus()` function
- [ ] Parse all swap statuses (PENDING_DEPOSIT, PROCESSING, SUCCESS, etc.)
- [ ] Create status polling mechanism
- [ ] Test: Monitor swap lifecycle

**Test Criteria**:
- ✅ Can check swap status by deposit address
- ✅ All status types handled correctly
- ✅ Can detect SUCCESS state
- ✅ Can detect REFUNDED state
- ✅ Transaction hashes extracted

**Estimated Time**: 2 hours

---

### Milestone 6: End-to-End Test Swap (Testnet) 🔄
**Goal**: Execute a complete swap on testnet

**Tasks**:
- [ ] Request quote for small amount (e.g., $1 USDC → NEAR)
- [ ] Generate deposit address
- [ ] Send tokens to deposit address (from test wallet)
- [ ] Submit deposit tx
- [ ] Monitor status until completion
- [ ] Verify tokens received

**Test Criteria**:
- ✅ Complete swap executes successfully
- ✅ Tokens received at destination
- ✅ Status tracking works end-to-end
- ✅ Refund works if swap fails

**Estimated Time**: 3 hours (includes debugging)

---

### Milestone 7: Parallel Trade Execution 🔄
**Goal**: Execute multiple swaps in parallel

**Tasks**:
- [ ] Implement parallel quote requests
- [ ] Handle multiple deposit addresses
- [ ] Monitor multiple swaps concurrently
- [ ] Test: Execute 3-5 swaps simultaneously

**Test Criteria**:
- ✅ Can request multiple quotes in parallel
- ✅ Each swap tracked independently
- ✅ Status updates work for all swaps
- ✅ No race conditions

**Estimated Time**: 2 hours

---

### Milestone 8: Retry Logic 🔄
**Goal**: Handle failed swaps with automatic retries

**Tasks**:
- [ ] Detect failed swaps
- [ ] Implement retry mechanism (up to 2 retries)
- [ ] Handle REFUNDED status
- [ ] Test: Force failures and verify retries

**Test Criteria**:
- ✅ Failed swaps detected
- ✅ Retry attempts logged
- ✅ Max retry limit respected
- ✅ Refunds processed correctly

**Estimated Time**: 2 hours

---

### Milestone 9: Integration with Index Rebalancing 🔄
**Goal**: Use NEAR Intents for actual index rebalancing

**Tasks**:
- [ ] Calculate required trades for rebalancing
- [ ] Generate quotes for all trades
- [ ] Execute trades via NEAR Intents
- [ ] Update index allocation after completion
- [ ] Test: Rebalance a test index

**Test Criteria**:
- ✅ Rebalancing calculates correct trades
- ✅ All trades execute successfully
- ✅ Index allocation updated
- ✅ Costs tracked accurately

**Estimated Time**: 3 hours

---

## 📋 Implementation Details

### API Endpoints to Implement

Based on [1Click API docs](https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api):

#### 1. Get Supported Tokens
```
GET https://1click.chaindefuser.com/v0/tokens
```

**Response**:
```json
[
  {
    "assetId": "nep141:wrap.near",
    "decimals": 24,
    "blockchain": "near",
    "symbol": "wNEAR",
    "price": "2.79",
    "priceUpdatedAt": "2025-03-28T12:23:00.070Z",
    "contractAddress": "wrap.near"
  }
]
```

#### 2. Request Quote
```
POST https://1click.chaindefuser.com/v0/quote
Authorization: Bearer {JWT_TOKEN} (optional)
```

**Request**:
```json
{
  "dry": false,
  "swapType": "EXACT_INPUT",
  "slippageTolerance": 100,
  "originAsset": "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
  "destinationAsset": "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
  "amount": "1000000",
  "recipient": "0x2527D02599Ba641c19FEa793cD0F167589a0f10D",
  "refundTo": "0x2527D02599Ba641c19FEa793cD0F167589a0f10D"
}
```

**Response**:
```json
{
  "depositAddress": "0x76b4c56085ED136a8744D52bE956396624a730E8",
  "amountIn": "1000000",
  "amountOut": "9950000",
  "deadline": "2025-03-04T15:00:00Z",
  "timeEstimate": 120
}
```

#### 3. Submit Deposit Transaction (Optional)
```
POST https://1click.chaindefuser.com/v0/deposit/submit
Authorization: Bearer {JWT_TOKEN} (optional)
```

**Request**:
```json
{
  "depositAddress": "0x76b4c56085ED136a8744D52bE956396624a730E8",
  "txHash": "0x123abc456def789"
}
```

#### 4. Check Swap Status
```
GET https://1click.chaindefuser.com/v0/status?depositAddress={address}
Authorization: Bearer {JWT_TOKEN} (optional)
```

**Response**:
```json
{
  "status": "SUCCESS",
  "swapDetails": {
    "amountIn": "1000000",
    "amountOut": "9950000",
    "destinationChainTxHashes": [
      {
        "hash": "0x123abc456def789",
        "explorerUrl": "https://..."
      }
    ]
  }
}
```

---

## 🔐 Authentication

**JWT Token** (optional but recommended):
- Avoids 0.1% fee
- Need to obtain from NEAR Intents team
- Store in environment variable: `NEAR_INTENTS_JWT_TOKEN`

**Without JWT**:
- API still works
- 0.1% (10 basis points) fee applied

---

## 📊 Swap Lifecycle

According to the [documentation](https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api):

1. **PENDING_DEPOSIT** - Awaiting deposit to deposit address
2. **PROCESSING** - Deposit detected, executing with Market Makers
3. **SUCCESS** - Funds delivered to destination
4. **INCOMPLETE_DEPOSIT** - Deposit below required amount
5. **REFUNDED** - Swap failed, funds returned to refund address
6. **FAILED** - Swap failed due to error

---

## 🧪 Testing Strategy

### Unit Tests
- Mock NEAR Intents API responses
- Test quote parsing
- Test status handling
- Test error scenarios

### Integration Tests
- Use testnet tokens
- Small amounts ($1-5)
- Test each milestone independently
- Document any quirks or issues

### End-to-End Tests
- Complete rebalancing flow
- Multiple parallel swaps
- Failure and retry scenarios
- Refund handling

---

## ⚠️ Important Considerations

### From Documentation

1. **CEX Deposits**:
   > "Centralized exchanges (CEXes) often use intermediate or per-user deposit addresses. These may not credit deposits sent via NEAR Intents until they are recognized or whitelisted. We recommend sending a small test amount before attempting full-scale transfers."

2. **Dry Run Usage**:
   > "Use `dry: true` to display the quote price without generating a transaction. Set `dry: false` only at confirmation to reduce system load."

3. **Amount Display**:
   > "The `amountOutUsd` field in quote responses should NOT be used in business logic or calculations. It is provided for display purposes only. Always use the actual token amounts for any programmatic operations."

### Our Additional Considerations

1. **Deadline Handling**: Quotes have deadlines. Need to track and handle expired quotes.
2. **Refund Address**: Always set to user's wallet for safety.
3. **Slippage**: Default to 1% (100 basis points), configurable per index.
4. **Parallel Execution**: Monitor system load, may need rate limiting.
5. **Error Recovery**: Store all quote/trade data for debugging.

---

## 📁 File Structure

```
src/integrations/
├── nearIntents.ts          # Main NEAR Intents client
├── nearIntentsTypes.ts     # Type definitions for API
└── nearIntentsHelpers.ts   # Helper functions

src/core/
├── tradeExecutor.ts        # Uses NEAR Intents to execute trades
└── tradeMonitor.ts         # Monitors swap status

src/storage/models/
├── Quote.ts                # Store NEAR Intents quotes
└── Trade.ts                # Already exists, extend for NEAR Intents
```

---

## 🎯 Success Criteria

### Milestone 1-5 (Basic Integration)
- [ ] Can fetch supported tokens
- [ ] Can generate quotes (dry and real)
- [ ] Can submit deposit transactions
- [ ] Can monitor swap status
- [ ] All error cases handled

### Milestone 6 (First Real Swap)
- [ ] Complete end-to-end swap on testnet
- [ ] Tokens received successfully
- [ ] Status tracking works
- [ ] Costs calculated correctly

### Milestone 7-9 (Production Ready)
- [ ] Parallel swaps working
- [ ] Retry logic functional
- [ ] Integrated with rebalancing
- [ ] Comprehensive error handling
- [ ] All edge cases covered

---

## 📝 Next Steps

1. **Start with Milestone 1**: Create basic NEAR Intents client
2. **Test incrementally**: Don't move to next milestone until current one passes
3. **Document issues**: Keep notes on any API quirks or unexpected behavior
4. **Use testnet**: Always test with small amounts first
5. **Monitor closely**: Watch swap status carefully during testing

---

## 🚀 Let's Begin!

**Current Status**: Ready to start Milestone 1
**Next Action**: Create `src/integrations/nearIntents.ts`

---

**Last Updated**: November 24, 2024
**Documentation Reference**: https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api

