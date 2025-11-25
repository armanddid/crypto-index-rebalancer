# Assets API - For Advisory Agent Integration

## 📋 Overview

The Assets API provides information about all available tokens from NEAR Intents that can be used in index creation. This is the **primary endpoint** the Advisory Agent should use to know what assets are available.

**Base URL**: `http://localhost:3000/api` (development)
**Production URL**: TBD (after Railway deployment)

---

## 🎯 Key Endpoints for Advisory Agent

### 1. Get All Available Assets
```
GET /api/assets
```

**Purpose**: Get complete list of all tradeable assets with prices and blockchain availability.

**Response**:
```json
{
  "assets": [...],           // Full list of all assets
  "assetsBySymbol": {...},   // Grouped by symbol
  "summary": [...],          // Simplified list (recommended for agent)
  "metadata": {
    "totalAssets": 120,
    "uniqueSymbols": 77,
    "blockchains": ["near", "eth", "sol", "btc", ...],
    "lastUpdated": "2025-11-24T23:10:00Z"
  }
}
```

**Summary Format** (recommended for agent):
```json
{
  "symbol": "USDC",
  "price": 0.999677,
  "primaryBlockchain": "eth",
  "availableOn": ["near", "eth", "arb", "base", "sol", ...],
  "chainCount": 12
}
```

**Use Case**: 
```
User: "Create an index with BTC, ETH, SOL, and NEAR"
Agent: 
  1. Call GET /api/assets
  2. Check if all symbols exist in summary
  3. Get current prices for portfolio simulation
  4. Recommend allocation percentages
```

---

### 2. Get Symbols Only (Lightweight)
```
GET /api/assets/symbols
```

**Purpose**: Quick lookup of available symbols (for autocomplete or validation).

**Response**:
```json
{
  "symbols": ["AAVE", "APT", "ARB", "AVAX", "BNB", "BTC", "DAI", "ETH", ...],
  "count": 77
}
```

**Use Case**:
```
User: "Can I add DOGE to my index?"
Agent:
  1. Call GET /api/assets/symbols
  2. Check if "DOGE" in symbols list
  3. Respond: "Yes, DOGE is available at $0.15"
```

---

### 3. Get Specific Asset Details
```
GET /api/assets/:symbol
GET /api/assets/:symbol?blockchain=eth
```

**Purpose**: Get detailed information about a specific asset.

**Response**:
```json
{
  "symbol": "USDC",
  "assets": [
    {
      "symbol": "USDC",
      "blockchain": "eth",
      "assetId": "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
      "price": 0.999677,
      "priceUsd": 0.999677,
      "decimals": 6,
      "contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "priceUpdatedAt": "2025-11-24T22:08:30.318Z"
    },
    ...
  ],
  "availableOn": ["near", "eth", "arb", "base", "sol", ...],
  "count": 12
}
```

**Use Case**:
```
User: "What chains is USDC available on?"
Agent:
  1. Call GET /api/assets/USDC
  2. Extract availableOn array
  3. Respond: "USDC is available on 12 chains: near, eth, arb, base, sol, ..."
```

---

### 4. Get Supported Blockchains
```
GET /api/assets/blockchains/list
```

**Purpose**: List all supported blockchains with token counts.

**Response**:
```json
{
  "blockchains": [
    { "blockchain": "near", "tokenCount": 26 },
    { "blockchain": "eth", "tokenCount": 20 },
    { "blockchain": "sol", "tokenCount": 14 },
    ...
  ],
  "count": 23
}
```

---

## 💡 Integration Examples

### Example 1: Validate User's Index Request

```typescript
// User asks: "Create an index with 40% BTC, 30% ETH, 20% SOL, 10% NEAR"

// Step 1: Get available assets
const response = await fetch('http://localhost:3000/api/assets');
const { summary } = await response.json();

// Step 2: Validate all symbols exist
const requestedSymbols = ['BTC', 'ETH', 'SOL', 'NEAR'];
const availableSymbols = summary.map(a => a.symbol);

const allAvailable = requestedSymbols.every(s => availableSymbols.includes(s));

if (!allAvailable) {
  const missing = requestedSymbols.filter(s => !availableSymbols.includes(s));
  return `Error: ${missing.join(', ')} not available`;
}

// Step 3: Get current prices
const prices = {};
requestedSymbols.forEach(symbol => {
  const asset = summary.find(a => a.symbol === symbol);
  prices[symbol] = asset.price;
});

// Step 4: Calculate portfolio value
const allocation = { BTC: 0.4, ETH: 0.3, SOL: 0.2, NEAR: 0.1 };
const portfolioValue = 10000; // $10k

const holdings = {};
Object.entries(allocation).forEach(([symbol, percentage]) => {
  const value = portfolioValue * percentage;
  holdings[symbol] = {
    value: value,
    amount: value / prices[symbol],
    price: prices[symbol]
  };
});

return `Portfolio created:
- BTC: ${holdings.BTC.amount.toFixed(4)} ($4,000 @ $${prices.BTC})
- ETH: ${holdings.ETH.amount.toFixed(4)} ($3,000 @ $${prices.ETH})
- SOL: ${holdings.SOL.amount.toFixed(4)} ($2,000 @ $${prices.SOL})
- NEAR: ${holdings.NEAR.amount.toFixed(2)} ($1,000 @ $${prices.NEAR})`;
```

### Example 2: Suggest Alternative Assets

```typescript
// User asks: "What are the top 5 most valuable assets?"

const response = await fetch('http://localhost:3000/api/assets');
const { summary } = await response.json();

// Summary is already sorted by price (descending)
const top5 = summary.slice(0, 5);

return `Top 5 assets by price:
${top5.map((a, i) => `${i+1}. ${a.symbol}: $${a.price.toFixed(2)}`).join('\n')}`;
```

### Example 3: Check Multi-Chain Availability

```typescript
// User asks: "Which chains support USDC?"

const response = await fetch('http://localhost:3000/api/assets/USDC');
const { availableOn, count } = await response.json();

return `USDC is available on ${count} chains: ${availableOn.join(', ')}`;
```

---

## 🔐 Authentication

**Current**: No authentication required (public endpoint)
**Future**: Optional JWT token for authenticated users

```bash
# Without auth (works now)
curl http://localhost:3000/api/assets

# With auth (future)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/assets
```

---

## 📊 Current Data (as of Nov 24, 2024)

- **Total Assets**: 120
- **Unique Symbols**: 77
- **Blockchains**: 23
- **Top Assets**: BTC ($88,995), ETH ($2,973), SOL ($138), NEAR ($1.93)
- **Most Available**: USDC (12 chains), ETH (5 chains)

---

## 🎯 Recommended Workflow for Advisory Agent

### When User Requests Index Creation:

1. **Fetch Available Assets**
   ```
   GET /api/assets
   ```

2. **Validate Symbols**
   - Check if all requested symbols exist
   - Get current prices

3. **Calculate Historical Returns** (using CoinGecko MCP)
   - Fetch historical data for each asset
   - Calculate returns over requested period

4. **Simulate Portfolio**
   - Calculate allocation values
   - Estimate total return
   - Calculate risk metrics (volatility, drawdown)

5. **Provide Recommendation**
   - Show portfolio composition
   - Display expected returns
   - Suggest any adjustments

6. **Create Index** (if user approves)
   ```
   POST /api/indices
   {
     "accountId": "acc_...",
     "name": "User's Index",
     "assets": [
       { "symbol": "BTC", "chain": "bitcoin", "percentage": 40 },
       { "symbol": "ETH", "chain": "ethereum", "percentage": 30 },
       { "symbol": "SOL", "chain": "solana", "percentage": 20 },
       { "symbol": "NEAR", "chain": "near", "percentage": 10 }
     ],
     ...
   }
   ```

---

## 🚨 Important Notes

### Price Data
- Prices are updated in real-time from NEAR Intents
- **Do NOT use for calculations** - use actual token amounts
- Prices are for **display purposes only**

### Multi-Chain Assets
- Many assets available on multiple chains (e.g., USDC on 12 chains)
- Agent should specify which chain to use when creating index
- Default to most liquid chain (usually `eth` or `near`)

### Symbol Conflicts
- Some symbols may appear on multiple chains
- Always check `availableOn` array
- Prefer established chains (eth, near, sol, btc)

---

## 📝 Example Conversation Flow

```
User: "I want to create a DeFi index"

Agent: 
  [Calls GET /api/assets]
  [Filters for DeFi tokens: UNI, AAVE, MKR, COMP, etc.]
  
  "I found these DeFi tokens available:
   - UNI: $8.50 (Uniswap)
   - AAVE: $179.59 (Aave)
   - MKR: $1,450 (Maker)
   - COMP: $45.20 (Compound)
   
   Would you like me to create an index with these assets?"

User: "Yes, equal weights"

Agent:
  [Calls CoinGecko MCP for historical data]
  [Calculates expected returns]
  
  "Based on historical data:
   - 1-year return: +45%
   - Volatility: 65%
   - Max drawdown: -35%
   
   Suggested allocation: 25% each
   
   Shall I create this index?"

User: "Yes, create it"

Agent:
  [Calls POST /api/indices]
  
  "Index created! ID: idx_abc123
   Please fund it with USDC to start trading."
```

---

## 🔗 Related Endpoints

- `POST /api/indices` - Create index (after asset selection)
- `GET /api/indices/:id` - Get index status
- `POST /api/indices/:id/deposit` - Fund index
- `POST /api/indices/:id/rebalance` - Trigger rebalancing

---

**Last Updated**: November 24, 2024
**Status**: ✅ Production Ready
**Next**: Deploy to Railway for Advisory Agent access

