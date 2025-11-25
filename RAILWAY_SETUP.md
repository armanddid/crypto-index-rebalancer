# Railway Deployment - Step by Step

## ✅ Repository Pushed to GitHub

Your code is now live at: https://github.com/armanddid/crypto-index-rebalancer

## 🚂 Deploy to Railway

### Step 1: Go to Railway

Visit: **https://railway.app/new**

### Step 2: Connect GitHub Repository

1. Click **"Deploy from GitHub repo"**
2. If not connected, click **"Configure GitHub App"**
3. Select **`armanddid/crypto-index-rebalancer`**
4. Click **"Deploy Now"**

Railway will automatically:
- ✅ Detect Node.js project
- ✅ Install dependencies
- ✅ Build TypeScript
- ✅ Run migrations
- ✅ Start the server

### Step 3: Configure Environment Variables

Once deployed, click on your service → **Variables** tab

Add these variables:

```bash
# Copy and paste these one by one:

NODE_ENV=production
PORT=3000
DATABASE_PATH=./data/index-rebalancer.db
NEAR_INTENTS_API_URL=https://1click.chaindefuser.com
NEAR_INTENTS_REFERRAL_CODE=crypto-index-rebalancer
NEAR_RPC_URL=https://rpc.mainnet.near.org
CORS_ORIGIN=*
```

### Step 4: Generate Secure Keys

Run these commands in your terminal to generate secure keys:

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET  
openssl rand -base64 32

# Generate WALLET_ENCRYPTION_KEY (must be exactly 32 chars)
openssl rand -hex 16
```

Add the generated keys to Railway:

```bash
JWT_SECRET=<paste-generated-key-here>
JWT_REFRESH_SECRET=<paste-generated-key-here>
WALLET_ENCRYPTION_KEY=<paste-generated-key-here>
```

### Step 5: Add Persistent Storage (Important!)

1. Click on your service
2. Go to **Settings** → **Volumes**
3. Click **"+ New Volume"**
4. Configure:
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB
5. Click **"Add"**

This ensures your database persists across deployments.

### Step 6: Verify Deployment

Railway will give you a URL like: `https://crypto-index-rebalancer-production.up.railway.app`

Test it:

```bash
# Health check
curl https://your-app.up.railway.app/health

# Expected response:
{"status":"ok","timestamp":"2024-11-25T..."}
```

## 🎯 Quick Test

### 1. Register a User

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

Copy the `token` from the response.

### 3. Create Account

```bash
curl -X POST https://your-app.up.railway.app/api/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "My Trading Account",
    "description": "Main index account"
  }'
```

You'll get back:
- `accountId`
- `walletAddress` (your EVM wallet)
- `intentsAccount` (your NEAR Intents account)

### 4. Get Deposit Address

```bash
curl -X POST https://your-app.up.railway.app/api/deposits/YOUR_ACCOUNT_ID/address \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "blockchain": "base",
    "asset": "USDC",
    "amount": "100"
  }'
```

Send USDC to the `depositAddress` to fund your account!

## 📊 Monitor Your Deployment

### View Logs

In Railway dashboard:
- Click on your service
- Go to **Deployments** tab
- Click **"View Logs"**

### Check Metrics

- **CPU Usage**
- **Memory Usage**
- **Network Traffic**

All visible in the Railway dashboard.

## 🔧 Troubleshooting

### Build Failed?

Check the build logs in Railway. Common issues:

1. **Missing dependencies**: Make sure `package.json` is complete
2. **TypeScript errors**: Run `npm run build` locally first
3. **Node version**: Ensure Node 18+ is specified

### Runtime Errors?

1. **Check environment variables**: Make sure all required vars are set
2. **Check database**: Ensure volume is mounted at `/app/data`
3. **Check logs**: Look for error messages in Railway logs

### Can't Connect?

1. **Check deployment status**: Should show "Active"
2. **Check health endpoint**: `curl https://your-app.up.railway.app/health`
3. **Check CORS**: Update `CORS_ORIGIN` if needed

## 🎨 Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Click **"+ Custom Domain"**
3. Enter: `api.yourdomain.com`
4. Update DNS records as shown
5. SSL certificate auto-provisioned!

## 💰 Cost

**Starter Plan** (Recommended for testing):
- $5 free credit/month
- Perfect for development and testing
- ~500 hours of runtime

**Pro Plan** ($20/month):
- Unlimited projects
- Priority support
- Custom domains included
- More resources

## 🚀 You're Live!

Your crypto index rebalancer is now deployed and ready to use!

**Next Steps:**
1. ✅ Test all API endpoints
2. ✅ Create your first index
3. ✅ Fund with small amount (test with $10-20)
4. ✅ Monitor first rebalancing
5. ✅ Build frontend or integrate with existing app

## 📞 Need Help?

- **Railway Docs**: https://docs.railway.app
- **GitHub Issues**: https://github.com/armanddid/crypto-index-rebalancer/issues
- **NEAR Intents Docs**: https://docs.near-intents.org

---

**Deployment Complete!** 🎉

Your API is live at: `https://your-app.up.railway.app`

View your GitHub repo: https://github.com/armanddid/crypto-index-rebalancer

