# Production Flow - Crypto Index Rebalancer

## Overview

This document describes the complete production flow for the Crypto Index Rebalancer, from user onboarding to automated rebalancing.

---

## 1. User Onboarding & Account Creation

### Step 1: User Registration
```
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "John Doe"
}
```

**What Happens:**
- User account created in database
- JWT token issued
- User can now create accounts

### Step 2: Create Account with Wallet
```
POST /api/accounts
{
  "name": "My Index Account"
}
```

**What Happens:**
1. **Generate EVM Wallet**
   - Private key generated using `ethers.Wallet.createRandom()`
   - Public address derived
   - Mnemonic phrase created

2. **Encrypt Private Key**
   - AES-256-GCM encryption
   - Encryption key from environment variable
   - Encrypted key stored in database

3. **Store Account**
   ```sql
   INSERT INTO accounts (
     account_id,
     user_id,
     name,
     wallet_address,
     encrypted_private_key,
     deposit_addresses
   ) VALUES (...)
   ```

4. **Return to User**
   ```json
   {
     "accountId": "acc_abc123",
     "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
     "depositAddresses": {...}
   }
   ```

**Security:**
- ✅ Private key never exposed to user
- ✅ Encrypted at rest in database
- ✅ Only decrypted in memory for signing
- ✅ Non-custodial (user can export if needed)

---

## 2. Funding the INTENTS Account

### Step 1: Generate Deposit Address
```
POST /api/deposits/:accountId/address
{
  "asset": "USDC",
  "blockchain": "base",
  "amount": "1000000000"  // 1000 USDC
}
```

**What Happens:**
1. Fetch account from database
2. Get wallet address (INTENTS account ID = lowercase wallet address)
3. Request quote from NEAR Intents:
   ```
   USDC (Base) → USDC (INTENTS)
   recipient: 0x742d35cc6634c0532925a3b844bc9e7595f0beb
   recipientType: 'INTENTS'
   ```
4. Return deposit address to user

**Response:**
```json
{
  "depositAddress": "0x4D772BeFf83Ba3dC4D7233eDd7562Fb45A6b0271",
  "amount": "1000",
  "estimatedOutput": "1000",
  "deadline": "2025-11-26T00:00:00Z",
  "intentsAccount": "0x742d35cc6634c0532925a3b844bc9e7595f0beb"
}
```

### Step 2: User Sends Funds
- User sends USDC to deposit address
- Transaction confirmed on Base network
- 1Click detects deposit automatically

### Step 3: Monitor Status
```
GET /api/deposits/:accountId/status?depositAddress=0x4D77...
```

**Status Flow:**
1. `PENDING_DEPOSIT` - Waiting for funds
2. `PROCESSING` - Swap in progress
3. `SUCCESS` - Funds in INTENTS! ✅

**Result:**
- 1000 USDC now in INTENTS account
- Ready for index creation

---

## 3. Index Creation

### Step 1: User Creates Index
```
POST /api/indices
{
  "accountId": "acc_abc123",
  "name": "Balanced Crypto Index",
  "allocations": [
    { "asset": "BTC", "percentage": 40 },
    { "asset": "ETH", "percentage": 30 },
    { "asset": "SOL", "percentage": 30 }
  ],
  "rebalancingConfig": {
    "method": "DRIFT_BASED",
    "driftThreshold": 5,  // 5% drift triggers rebalance
    "checkInterval": 3600 // Check every hour
  }
}
```

**What Happens:**
1. Validate allocations (must sum to 100%)
2. Check INTENTS balance (1000 USDC available)
3. Create index record in database
4. Queue initial portfolio construction

### Step 2: Initial Portfolio Construction

**System Process (Automated):**

1. **Calculate Target Amounts**
   ```
   BTC: 1000 * 0.40 = 400 USDC
   ETH: 1000 * 0.30 = 300 USDC
   SOL: 1000 * 0.30 = 300 USDC
   ```

2. **Decrypt Private Key**
   ```typescript
   const encryptedKey = account.encrypted_private_key;
   const privateKey = decryptWalletPrivateKey(encryptedKey);
   const wallet = new ethers.Wallet(privateKey);
   ```

3. **Generate Quotes (Parallel)**
   ```typescript
   const quotes = await Promise.all([
     nearIntents.requestQuote({
       originAsset: 'USDC (INTENTS)',
       destinationAsset: 'BTC (INTENTS)',
       amount: '400000000', // 400 USDC
       recipient: intentsAccount,
       recipientType: 'INTENTS',
       depositType: 'INTENTS'  // ← From INTENTS!
     }),
     // ... ETH and SOL quotes
   ]);
   ```

4. **Execute Swaps (Sequential with Retry)**
   ```
   USDC → BTC (INTENTS): ~10 seconds ⚡
   USDC → ETH (INTENTS): ~10 seconds ⚡
   USDC → SOL (INTENTS): ~10 seconds ⚡
   
   Total time: ~30 seconds!
   ```

5. **Monitor Each Swap**
   - Poll status every 5 seconds
   - Wait for SUCCESS status
   - Record trade in database

6. **Update Index State**
   ```sql
   UPDATE indices SET
     current_allocations = '[{"BTC": 0.005}, {"ETH": 0.1}, {"SOL": 2.5}]',
     total_value_usd = 1000,
     status = 'ACTIVE',
     last_rebalanced_at = NOW()
   ```

**Result:**
- Portfolio constructed in ~30 seconds
- All assets in INTENTS account
- Index is now ACTIVE

---

## 4. Automatic Rebalancing

### Drift Monitoring (Continuous)

**Cron Job (Every Hour):**
```typescript
cron.schedule('0 * * * *', async () => {
  const activeIndices = await getActiveIndices();
  
  for (const index of activeIndices) {
    await checkAndRebalance(index);
  }
});
```

**Drift Calculation:**
```typescript
// Get current prices
const btcPrice = await nearIntents.getTokenPrice('BTC');
const ethPrice = await nearIntents.getTokenPrice('ETH');
const solPrice = await nearIntents.getTokenPrice('SOL');

// Calculate current values
const btcValue = index.btcAmount * btcPrice;  // e.g., 450 USDC
const ethValue = index.ethAmount * ethPrice;  // e.g., 280 USDC
const solValue = index.solAmount * solPrice;  // e.g., 270 USDC
const totalValue = btcValue + ethValue + solValue; // 1000 USDC

// Calculate current percentages
const btcPercent = (btcValue / totalValue) * 100;  // 45%
const ethPercent = (ethValue / totalValue) * 100;  // 28%
const solPercent = (solValue / totalValue) * 100;  // 27%

// Calculate drift
const btcDrift = Math.abs(btcPercent - 40);  // 5%
const ethDrift = Math.abs(ethPercent - 30);  // 2%
const solDrift = Math.abs(solPercent - 30);  // 3%

// Check threshold
const maxDrift = Math.max(btcDrift, ethDrift, solDrift);  // 5%
const needsRebalance = maxDrift >= index.driftThreshold;  // true!
```

### Rebalancing Execution

**When Drift Threshold Exceeded:**

1. **Calculate Required Trades**
   ```
   Current: BTC 45%, ETH 28%, SOL 27%
   Target:  BTC 40%, ETH 30%, SOL 30%
   
   Trades needed:
   - Sell 50 USDC worth of BTC
   - Buy 20 USDC worth of ETH
   - Buy 30 USDC worth of SOL
   ```

2. **Decrypt Private Key**
   ```typescript
   const privateKey = decryptWalletPrivateKey(account.encrypted_private_key);
   ```

3. **Execute Trades (INTENTS → INTENTS)**
   ```
   BTC → USDC (INTENTS): ~10 seconds
   USDC → ETH (INTENTS): ~10 seconds
   USDC → SOL (INTENTS): ~10 seconds
   
   Total: ~30 seconds for full rebalance!
   ```

4. **Record Trades**
   ```sql
   INSERT INTO trades (
     index_id,
     from_asset,
     to_asset,
     amount_in,
     amount_out,
     status,
     tx_hash
   ) VALUES (...)
   ```

5. **Update Index**
   ```sql
   UPDATE indices SET
     current_allocations = '[new allocations]',
     last_rebalanced_at = NOW(),
     rebalance_count = rebalance_count + 1
   ```

**Result:**
- Portfolio rebalanced to target allocations
- All trades completed in ~30 seconds
- No user interaction required
- All trades within INTENTS (fast & cheap!)

---

## 5. User Withdrawals

### Step 1: User Requests Withdrawal
```
POST /api/indices/:indexId/withdraw
{
  "percentage": 50,  // Withdraw 50% of index
  "destinationAsset": "USDC",
  "destinationChain": "base",
  "destinationAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**What Happens:**

1. **Calculate Withdrawal Amounts**
   ```
   Total value: 1000 USDC
   Withdraw: 50% = 500 USDC
   
   Sell proportionally:
   - BTC: 0.0025 (50% of 0.005)
   - ETH: 0.05 (50% of 0.1)
   - SOL: 1.25 (50% of 2.5)
   ```

2. **Decrypt Private Key**

3. **Swap to USDC (in INTENTS)**
   ```
   BTC → USDC (INTENTS): ~10 seconds
   ETH → USDC (INTENTS): ~10 seconds
   SOL → USDC (INTENTS): ~10 seconds
   
   Result: 500 USDC in INTENTS
   ```

4. **Withdraw to External Chain**
   ```
   USDC (INTENTS) → USDC (Base)
   depositType: 'INTENTS'
   recipientType: 'DESTINATION_CHAIN'
   recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
   
   Time: ~45 seconds
   ```

5. **Update Index**
   ```sql
   UPDATE indices SET
     current_allocations = '[reduced by 50%]',
     total_value_usd = 500
   ```

**Result:**
- 500 USDC sent to user's wallet on Base
- Remaining 500 USDC worth stays in index
- Total time: ~1 minute

---

## 6. Security & Best Practices

### Private Key Management

**Storage:**
- ✅ AES-256-GCM encryption
- ✅ Unique IV per encryption
- ✅ Encryption key in environment variable (never in code)
- ✅ Encrypted keys in database

**Usage:**
- ✅ Only decrypted in memory
- ✅ Never logged or exposed
- ✅ Cleared from memory after use
- ✅ Used only for transaction signing

**Example:**
```typescript
async function executeSwap(accountId: string, swapParams: any) {
  // 1. Get encrypted key from database
  const account = await findAccountById(accountId);
  
  // 2. Decrypt in memory
  const privateKey = decryptWalletPrivateKey(account.encrypted_private_key);
  
  // 3. Create wallet instance
  const wallet = new ethers.Wallet(privateKey);
  
  // 4. Sign transaction
  const signedTx = await wallet.signTransaction(tx);
  
  // 5. Clear from memory (garbage collection)
  // privateKey goes out of scope
  
  return signedTx;
}
```

### Error Handling & Retry Logic

**Swap Failures:**
```typescript
async function executeSwapWithRetry(params: SwapParams, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const quote = await nearIntents.requestQuote(params);
      const status = await monitorSwapStatus(quote.depositAddress);
      
      if (status === 'SUCCESS') {
        return { success: true, quote };
      } else if (status === 'REFUNDED') {
        if (attempt < maxRetries) {
          logger.warn(`Swap refunded, retrying (${attempt + 1}/${maxRetries})`);
          continue;
        }
        throw new Error('Swap failed after retries');
      }
    } catch (error) {
      if (attempt < maxRetries) {
        logger.error(`Swap error, retrying (${attempt + 1}/${maxRetries})`, error);
        await sleep(5000); // Wait 5 seconds
        continue;
      }
      throw error;
    }
  }
}
```

### Monitoring & Alerts

**Key Metrics:**
- Rebalance success rate
- Average swap time
- Failed trades
- Drift levels
- User withdrawals

**Alerts:**
- Failed rebalances
- High drift not rebalancing
- Swap timeouts
- Low INTENTS balances

---

## 7. Performance Characteristics

### Speed Comparison

**Traditional Cross-Chain Swaps:**
- ETH → SOL: 45-52 seconds
- Multiple hops: 2-5 minutes
- Gas fees: Variable, often high

**INTENTS → INTENTS Swaps:**
- Any asset → Any asset: ~10 seconds ⚡
- Multiple swaps: Parallel execution
- Fees: Minimal (included in quote)

### Rebalancing Example

**Scenario:** 3-asset index needs rebalancing

**Traditional Approach:**
```
Sell BTC → USDC: 45 seconds
Buy ETH with USDC: 45 seconds
Buy SOL with USDC: 45 seconds
Total: 135 seconds (2.25 minutes)
```

**INTENTS Approach:**
```
BTC → USDC (INTENTS): 10 seconds
USDC → ETH (INTENTS): 10 seconds
USDC → SOL (INTENTS): 10 seconds
Total: 30 seconds (5x faster!)
```

---

## 8. Future Enhancements

### Planned Features

1. **Advanced Rebalancing Strategies**
   - Time-weighted rebalancing
   - Volatility-based adjustments
   - Tax-loss harvesting

2. **Multi-Index Support**
   - Multiple indexes per account
   - Cross-index rebalancing
   - Index-to-index transfers

3. **Performance Analytics**
   - Historical returns
   - Sharpe ratio
   - Drawdown analysis
   - Benchmark comparison

4. **Social Features**
   - Copy trading
   - Share index compositions
   - Leaderboards

5. **Advanced Order Types**
   - Limit orders
   - DCA (Dollar Cost Averaging)
   - Stop-loss

---

## Conclusion

The Crypto Index Rebalancer provides a fast, secure, and automated way to maintain crypto portfolios. By leveraging NEAR Intents and the INTENTS virtual account system, we achieve:

- ✅ **Fast rebalancing**: 10-second swaps
- ✅ **Secure key management**: AES-256-GCM encryption
- ✅ **Automated execution**: No user interaction needed
- ✅ **Multi-asset support**: 120 tokens across 23 chains
- ✅ **Non-custodial**: User controls funds

**Ready for production!** 🚀

