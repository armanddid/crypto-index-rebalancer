# Implementation Plan - Crypto Index Rebalancer

## Project Status

**Created**: November 24, 2024
**Status**: Initial Setup Complete
**Phase**: Core Implementation

---

## What's Been Created

### ✅ Project Structure
```
crypto-index-rebalancer/
├── API_SPECIFICATION.md     # Complete API documentation
├── README.md                # Project overview and setup
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── env.example              # Environment variables template
├── src/                     # Source code directory (structure created)
│   ├── api/
│   ├── core/
│   ├── integrations/
│   ├── storage/
│   ├── scheduler/
│   └── utils/
├── data/                    # Database storage
└── logs/                    # Application logs
```

### ✅ Documentation
- Complete API specification with all endpoints
- Detailed README with architecture and setup instructions
- Environment configuration template

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
**Priority**: HIGH
**Status**: Next Up

#### 1.1 Types & Interfaces
- [ ] `src/types/index.ts` - Core type definitions
- [ ] `src/types/api.ts` - API request/response types
- [ ] `src/types/database.ts` - Database model types

#### 1.2 Utilities
- [ ] `src/utils/logger.ts` - Winston logger setup
- [ ] `src/utils/crypto.ts` - Encryption/decryption utilities
- [ ] `src/utils/validation.ts` - Zod validation schemas
- [ ] `src/utils/errors.ts` - Custom error classes

#### 1.3 Database
- [ ] `src/storage/database.ts` - SQLite wrapper
- [ ] `src/storage/models/User.ts` - User model
- [ ] `src/storage/models/Account.ts` - Account model
- [ ] `src/storage/models/Index.ts` - Index model
- [ ] `src/storage/models/Trade.ts` - Trade model
- [ ] `src/storage/models/Rebalance.ts` - Rebalance model
- [ ] `src/storage/models/Webhook.ts` - Webhook model
- [ ] `src/storage/migrate.ts` - Database migration script

---

### Phase 2: Authentication & Account Management (Week 1-2)
**Priority**: HIGH
**Status**: Pending

#### 2.1 Authentication
- [ ] `src/api/middleware/auth.ts` - JWT authentication middleware
- [ ] `src/api/routes/auth.ts` - Auth endpoints (register, login, refresh)
- [ ] `src/core/authService.ts` - Authentication logic

#### 2.2 Account Management
- [ ] `src/integrations/walletManager.ts` - EVM wallet generation
- [ ] `src/core/accountManager.ts` - Account CRUD operations
- [ ] `src/api/routes/accounts.ts` - Account endpoints

---

### Phase 3: Index Management (Week 2)
**Priority**: HIGH
**Status**: Pending

#### 3.1 Core Index Logic
- [ ] `src/core/indexManager.ts` - Index CRUD operations
- [ ] `src/core/driftCalculator.ts` - Drift calculation logic
- [ ] `src/api/routes/indices.ts` - Index endpoints

#### 3.2 Index Operations
- [ ] Endpoint: `POST /api/indices` - Create index
- [ ] Endpoint: `GET /api/indices` - List indices
- [ ] Endpoint: `GET /api/indices/:id` - Get index details
- [ ] Endpoint: `PATCH /api/indices/:id` - Update index
- [ ] Endpoint: `DELETE /api/indices/:id` - Delete index

---

### Phase 4: NEAR Intents Integration (Week 2-3)
**Priority**: CRITICAL
**Status**: Pending

#### 4.1 NEAR Intents Client
- [ ] `src/integrations/nearIntents.ts` - 1Click API client
  - [ ] Get supported tokens
  - [ ] Request quote
  - [ ] Submit deposit tx
  - [ ] Check swap status
  - [ ] Handle errors and retries

#### 4.2 Trade Execution
- [ ] `src/core/tradeExecutor.ts` - Trade execution logic
  - [ ] Execute single trade
  - [ ] Execute parallel trades
  - [ ] Monitor trade status
  - [ ] Retry failed trades
  - [ ] Update database

---

### Phase 5: Rebalancing Engine (Week 3)
**Priority**: CRITICAL
**Status**: Pending

#### 5.1 Rebalancing Logic
- [ ] `src/core/rebalancer.ts` - Core rebalancing engine
  - [ ] Calculate required trades
  - [ ] Optimize trade sequence
  - [ ] Execute rebalancing
  - [ ] Handle partial failures

#### 5.2 Rebalancing Endpoints
- [ ] Endpoint: `POST /api/indices/:id/rebalance` - Trigger rebalance
- [ ] Endpoint: `GET /api/indices/:id/drift` - Get drift
- [ ] Endpoint: `GET /api/indices/:id/rebalances` - Rebalance history

---

### Phase 6: Deposit & Withdrawal (Week 3)
**Priority**: HIGH
**Status**: Pending

#### 6.1 Funding Operations
- [ ] Endpoint: `POST /api/indices/:id/deposit` - Fund index
- [ ] Endpoint: `POST /api/indices/:id/withdraw` - Withdraw from index
- [ ] Endpoint: `POST /api/indices/:id/liquidate` - Liquidate index

#### 6.2 Auto-Invest Logic
- [ ] Implement auto-invest on deposit
- [ ] Proportional selling on withdrawal

---

### Phase 7: Price Oracle (Week 3)
**Priority**: HIGH
**Status**: Pending

#### 7.1 CoinGecko Integration
- [ ] `src/integrations/priceOracle.ts` - Price fetching
  - [ ] Get current prices
  - [ ] Get historical prices
  - [ ] Cache prices
  - [ ] Handle rate limits

#### 7.2 Price Endpoints
- [ ] Endpoint: `GET /api/prices` - Get all prices
- [ ] Endpoint: `GET /api/prices/:symbol` - Get single price
- [ ] Endpoint: `GET /api/supported-assets` - List supported assets

---

### Phase 8: Monitoring & Analytics (Week 4)
**Priority**: MEDIUM
**Status**: Pending

#### 8.1 Performance Metrics
- [ ] Calculate returns (1d, 7d, 30d, since inception)
- [ ] Calculate risk metrics (volatility, max drawdown, Sharpe ratio)
- [ ] Benchmark comparison

#### 8.2 Analytics Endpoints
- [ ] Endpoint: `GET /api/indices/:id/performance` - Performance metrics
- [ ] Endpoint: `GET /api/indices/:id/trades` - Trade history
- [ ] Endpoint: `GET /api/indices/:id/history` - Historical data

---

### Phase 9: Scheduler & Automation (Week 4)
**Priority**: HIGH
**Status**: Pending

#### 9.1 Rebalancing Scheduler
- [ ] `src/scheduler/rebalanceScheduler.ts` - Cron job setup
  - [ ] Check all active indices
  - [ ] Calculate drift
  - [ ] Trigger rebalancing if needed
  - [ ] Handle errors

#### 9.2 Background Jobs
- [ ] Price updates (every 5 minutes)
- [ ] Drift checks (every 5 minutes)
- [ ] Trade status monitoring (every 30 seconds)

---

### Phase 10: Webhooks & Notifications (Week 4)
**Priority**: MEDIUM
**Status**: Pending

#### 10.1 Webhook System
- [ ] `src/core/webhookManager.ts` - Webhook delivery
- [ ] `src/api/routes/webhooks.ts` - Webhook endpoints
- [ ] Event: `index.rebalanced`
- [ ] Event: `index.drift_threshold`
- [ ] Event: `index.trade_completed`
- [ ] Event: `index.trade_failed`

---

### Phase 11: API Server & Middleware (Week 1)
**Priority**: HIGH
**Status**: Pending

#### 11.1 Express Server
- [ ] `src/api/server.ts` - Express app setup
- [ ] `src/server.ts` - Entry point

#### 11.2 Middleware
- [ ] `src/api/middleware/errorHandler.ts` - Global error handling
- [ ] `src/api/middleware/validation.ts` - Request validation
- [ ] `src/api/middleware/rateLimit.ts` - Rate limiting
- [ ] `src/api/middleware/cors.ts` - CORS configuration

#### 11.3 Health & Status
- [ ] Endpoint: `GET /api/health` - Health check
- [ ] Endpoint: `GET /api/status` - System status

---

### Phase 12: Testing (Week 5)
**Priority**: HIGH
**Status**: Pending

#### 12.1 Unit Tests
- [ ] Test accountManager
- [ ] Test indexManager
- [ ] Test driftCalculator
- [ ] Test rebalancer
- [ ] Test tradeExecutor

#### 12.2 Integration Tests
- [ ] Test NEAR Intents integration
- [ ] Test price oracle
- [ ] Test full rebalancing flow

#### 12.3 End-to-End Tests
- [ ] Create account → Create index → Fund → Rebalance → Withdraw

---

### Phase 13: Deployment & DevOps (Week 5)
**Priority**: MEDIUM
**Status**: Pending

#### 13.1 Docker
- [ ] Create Dockerfile
- [ ] Create docker-compose.yml
- [ ] Test containerization

#### 13.2 Railway Deployment
- [ ] Create railway.json
- [ ] Set up environment variables
- [ ] Deploy to Railway
- [ ] Test production deployment

#### 13.3 CI/CD
- [ ] GitHub Actions for tests
- [ ] Automatic deployment on push to main

---

### Phase 14: MCP Integration (Week 5)
**Priority**: LOW (After core is stable)
**Status**: Pending

#### 14.1 MCP Wrapper
- [ ] Create `mcp-wrapper/` directory
- [ ] Implement MCP server
- [ ] Expose 8-10 core tools
- [ ] Test with Claude Desktop

#### 14.2 ChatGPT Custom GPT
- [ ] Add OpenAPI spec endpoint
- [ ] Create Custom GPT
- [ ] Test conversational interface

---

## Development Priorities

### Week 1: Foundation
1. ✅ Project structure
2. ✅ Documentation
3. Types & interfaces
4. Database setup
5. Authentication
6. Account management

### Week 2: Core Features
1. Index management
2. NEAR Intents integration
3. Trade execution
4. Basic rebalancing

### Week 3: Advanced Features
1. Deposit/withdrawal
2. Price oracle
3. Scheduler
4. Performance metrics

### Week 4: Polish & Testing
1. Webhooks
2. Analytics
3. Comprehensive testing
4. Bug fixes

### Week 5: Deployment & Extras
1. Production deployment
2. Monitoring setup
3. MCP integration
4. Documentation updates

---

## Next Immediate Steps

1. **Install dependencies**
   ```bash
   cd crypto-index-rebalancer
   npm install
   ```

2. **Create core types**
   - `src/types/index.ts`
   - `src/types/api.ts`
   - `src/types/database.ts`

3. **Set up database**
   - `src/storage/database.ts`
   - `src/storage/models/*.ts`
   - `src/storage/migrate.ts`

4. **Create utilities**
   - `src/utils/logger.ts`
   - `src/utils/crypto.ts`
   - `src/utils/validation.ts`

5. **Build authentication**
   - `src/api/middleware/auth.ts`
   - `src/api/routes/auth.ts`
   - `src/core/authService.ts`

---

## Success Metrics

### MVP (Minimum Viable Product)
- [ ] User can register and login
- [ ] User can create an account with wallet
- [ ] User can create an index
- [ ] User can fund an index
- [ ] System can calculate drift
- [ ] System can execute rebalancing
- [ ] Trades execute via NEAR Intents
- [ ] User can view index status

### Full Feature Set
- [ ] All API endpoints implemented
- [ ] Automatic rebalancing working
- [ ] Performance analytics available
- [ ] Webhooks functional
- [ ] 80%+ test coverage
- [ ] Production deployed
- [ ] MCP integration complete

---

## Technical Debt & Future Enhancements

### Known Limitations
- SQLite (single file) - migrate to PostgreSQL for production scale
- No database replication
- No distributed locking for rebalancing
- Basic price caching (could use Redis)

### Future Features
- Multiple base currencies (not just USDC)
- Advanced rebalancing strategies (momentum, mean reversion)
- Portfolio optimization algorithms
- Backtesting engine
- Mobile app
- Advanced analytics dashboard
- Social features (copy trading)

---

## Resources

- **NEAR Intents Docs**: https://docs.near-intents.org
- **CoinGecko API**: https://www.coingecko.com/en/api
- **Ethers.js**: https://docs.ethers.org
- **Express.js**: https://expressjs.com
- **Better-SQLite3**: https://github.com/WiseLibs/better-sqlite3

---

**Last Updated**: November 24, 2024
**Next Review**: After Phase 1 completion

