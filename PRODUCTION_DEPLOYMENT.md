# Production Deployment Checklist

## ✅ Code Status

- ✅ All code committed to GitHub
- ✅ Repository: https://github.com/armanddid/crypto-index-rebalancer
- ✅ Branch: `main`
- ✅ Latest commit: Background jobs and webhook system
- ✅ All tests passing

## 🚀 Deploy to Railway

### Step 1: Create Railway Project

1. Go to **https://railway.app/new**
2. Click **"Deploy from GitHub repo"**
3. Select **`armanddid/crypto-index-rebalancer`**
4. Click **"Deploy Now"**

Railway will automatically:
- Detect Node.js project
- Install dependencies (`npm install`)
- Build TypeScript (`npm run build`)
- Run migrations (`npm run migrate`)
- Start server (`npm start`)

### Step 2: Configure Environment Variables

Go to your Railway project → **Variables** tab and add:

#### Required Variables

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_PATH=./data/index-rebalancer.db

# NEAR Intents
NEAR_INTENTS_API_URL=https://1click.chaindefuser.com
NEAR_INTENTS_REFERRAL_CODE=crypto-index-rebalancer
NEAR_RPC_URL=https://rpc.mainnet.near.org

# CORS (update with your frontend URL)
CORS_ORIGIN=*
```

#### Security Keys (GENERATE NEW ONES!)

Run these commands to generate secure keys:

```bash
# Generate JWT_SECRET (32+ characters)
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET (32+ characters)
openssl rand -base64 32

# Generate WALLET_ENCRYPTION_KEY (exactly 32 characters)
openssl rand -hex 16
```

Add them to Railway:

```bash
JWT_SECRET=<paste-generated-key-here>
JWT_REFRESH_SECRET=<paste-generated-key-here>
WALLET_ENCRYPTION_KEY=<paste-generated-key-here>
```

#### Background Jobs (Optional)

```bash
# Enable drift monitoring (default: true)
DRIFT_MONITOR_ENABLED=true

# Cron schedule (default: every 5 minutes)
DRIFT_MONITOR_SCHEDULE=*/5 * * * *
```

### Step 3: Add Persistent Storage

**IMPORTANT**: This ensures your database persists across deployments.

1. Click on your Railway service
2. Go to **Settings** → **Volumes**
3. Click **"+ New Volume"**
4. Configure:
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB (or more based on needs)
5. Click **"Add"**

### Step 4: Verify Deployment

Once deployed, Railway will give you a URL like:
`https://crypto-index-rebalancer-production.up.railway.app`

Test it:

```bash
# Health check
curl https://your-app.up.railway.app/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-11-25T...",
  "services": {
    "database": "healthy",
    "nearIntents": "unknown",
    "priceOracle": "unknown"
  }
}
```

## 🧪 Post-Deployment Testing

### 1. Register a Test User

```bash
curl -X POST https://your-app.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'
```

### 2. Login

```bash
curl -X POST https://your-app.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

Save the `token` from the response.

### 3. Create an Account

```bash
curl -X POST https://your-app.up.railway.app/api/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My Trading Account",
    "description": "Main index account"
  }'
```

You'll get:
- `accountId`
- `walletAddress` (EVM wallet)
- `intentsAccount` (NEAR Intents account)

### 4. Get Deposit Address

```bash
curl -X POST https://your-app.up.railway.app/api/deposits/YOUR_ACCOUNT_ID/address \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "blockchain": "base",
    "asset": "USDC",
    "amount": "100"
  }'
```

### 5. Create a Webhook (Optional)

Use https://webhook.site to get a test URL:

```bash
curl -X POST https://your-app.up.railway.app/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://webhook.site/your-unique-id",
    "events": ["rebalance.completed", "drift.threshold_exceeded"],
    "description": "Test notifications"
  }'
```

### 6. Create an Index

```bash
curl -X POST https://your-app.up.railway.app/api/indexes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "accountId": "YOUR_ACCOUNT_ID",
    "name": "Balanced Crypto Index",
    "description": "40% BTC, 30% ETH, 20% SOL, 10% USDC",
    "allocations": [
      { "symbol": "BTC", "percentage": 40 },
      { "symbol": "ETH", "percentage": 30 },
      { "symbol": "SOL", "percentage": 20 },
      { "symbol": "USDC", "percentage": 10 }
    ],
    "rebalancingConfig": {
      "method": "DRIFT",
      "driftThreshold": 5
    },
    "riskConfig": {
      "maxDrawdown": 20,
      "stopLoss": 15
    }
  }'
```

## 📊 Monitoring

### View Logs

In Railway dashboard:
- Click on your service
- Go to **Deployments** tab
- Click **"View Logs"**

Look for:
- `✅ Background jobs initialized`
- `Starting drift monitor job`
- `Drift monitor job completed`

### Check Metrics

Railway dashboard shows:
- **CPU Usage**
- **Memory Usage**
- **Network Traffic**
- **Request Count**

### Database Size

Monitor your volume usage in Railway:
- Settings → Volumes
- Check used space

## 🔒 Security Checklist

### ✅ Before Going Live

- [ ] Generated new JWT secrets (not using example keys)
- [ ] Generated new wallet encryption key (exactly 32 chars)
- [ ] Set up persistent volume for database
- [ ] Updated CORS_ORIGIN to your frontend domain
- [ ] Tested with small amounts first
- [ ] Set up webhooks for monitoring
- [ ] Reviewed all environment variables
- [ ] Tested authentication flow
- [ ] Tested account creation
- [ ] Tested index creation

### 🔐 Security Best Practices

- ✅ Never commit `.env` files
- ✅ Never share private keys or secrets
- ✅ Always use HTTPS in production
- ✅ Rotate keys periodically (every 90 days)
- ✅ Monitor for suspicious activity
- ✅ Set up alerts for failed authentications
- ✅ Regular database backups
- ✅ Keep dependencies updated

## 🎯 Production Configuration

### Recommended Settings

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_PATH=./data/index-rebalancer.db

# Background Jobs
DRIFT_MONITOR_ENABLED=true
DRIFT_MONITOR_SCHEDULE=*/5 * * * *  # Every 5 minutes

# CORS (restrict to your domain)
CORS_ORIGIN=https://your-frontend.com

# Logging
LOG_LEVEL=info  # Use 'debug' only for troubleshooting
```

### For High-Volume Trading

```bash
# More frequent monitoring
DRIFT_MONITOR_SCHEDULE=*/2 * * * *  # Every 2 minutes

# Larger volume
# Upgrade Railway plan to Pro for more resources
```

## 🚨 Troubleshooting

### Build Fails

**Check logs in Railway:**
- Look for TypeScript errors
- Check for missing dependencies
- Verify Node.js version (18+)

**Common fixes:**
```bash
# Locally test build
npm run build

# Check for errors
npm run lint
```

### Runtime Errors

**Database not found:**
- Verify volume is mounted at `/app/data`
- Check DATABASE_PATH environment variable

**Environment variables not loaded:**
- Verify all required variables are set in Railway
- Check for typos in variable names

**Background jobs not running:**
- Check logs for "Background jobs initialized"
- Verify DRIFT_MONITOR_ENABLED=true
- Check cron schedule syntax

### Performance Issues

**Slow API responses:**
- Check Railway metrics
- Consider upgrading to Pro plan
- Optimize database queries

**High memory usage:**
- Monitor memory in Railway dashboard
- Check for memory leaks in logs
- Consider increasing resources

## 📞 Support

### Resources

- **Railway Docs**: https://docs.railway.app
- **GitHub Repo**: https://github.com/armanddid/crypto-index-rebalancer
- **NEAR Intents Docs**: https://docs.near-intents.org
- **API Documentation**: See `API_SPECIFICATION.md`
- **Background Jobs**: See `BACKGROUND_JOBS.md`

### Getting Help

1. Check logs in Railway dashboard
2. Review documentation in repository
3. Open GitHub issue with:
   - Error message
   - Steps to reproduce
   - Environment details

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ Health check returns 200 OK
- ✅ User registration works
- ✅ Account creation generates wallets
- ✅ Index creation succeeds
- ✅ Background jobs are running
- ✅ Webhooks receive notifications
- ✅ Logs show no errors

## 📈 Next Steps After Deployment

1. **Monitor First 24 Hours**
   - Check logs regularly
   - Verify background jobs run
   - Monitor webhook deliveries

2. **Test with Small Amounts**
   - Create test index with $10-20
   - Wait for drift to accumulate
   - Verify automatic rebalancing

3. **Set Up Monitoring**
   - Configure webhooks for your system
   - Set up alerts for failures
   - Create dashboard for metrics

4. **Scale Gradually**
   - Start with few users
   - Monitor performance
   - Upgrade resources as needed

5. **Build Frontend**
   - User dashboard
   - Index management UI
   - Portfolio analytics

---

## 🚀 Ready to Deploy!

Everything is configured and ready. Follow the steps above to deploy to Railway.

**Estimated Time**: 10-15 minutes

**Deployment URL**: https://railway.app/new

**GitHub Repo**: https://github.com/armanddid/crypto-index-rebalancer

Good luck with your deployment! 🎉

