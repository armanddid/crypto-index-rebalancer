# Deployment Guide - Railway

## Prerequisites

1. Railway account ([railway.app](https://railway.app))
2. GitHub repository connected
3. Environment variables configured

## Quick Deploy to Railway

### Option 1: Deploy from GitHub (Recommended)

1. **Connect Repository**
   ```bash
   # Push your code to GitHub
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/armanddid/crypto-index-rebalancer.git
   git branch -M main
   git push -u origin main
   ```

2. **Create Railway Project**
   - Go to [railway.app/new](https://railway.app/new)
   - Click "Deploy from GitHub repo"
   - Select `armanddid/crypto-index-rebalancer`
   - Railway will auto-detect Node.js and deploy

3. **Configure Environment Variables**
   
   Go to your Railway project → Variables tab and add:

   ```bash
   # Server Configuration
   NODE_ENV=production
   PORT=3000
   
   # Database (Railway will create data directory)
   DATABASE_PATH=./data/index-rebalancer.db
   
   # Security Keys (GENERATE NEW ONES!)
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
   WALLET_ENCRYPTION_KEY=your-32-character-encryption-key
   
   # NEAR Intents API
   NEAR_INTENTS_API_URL=https://1click.chaindefuser.com
   NEAR_INTENTS_REFERRAL_CODE=crypto-index-rebalancer
   # NEAR_INTENTS_JWT_TOKEN=optional-jwt-token-for-0.1%-fee-savings
   
   # NEAR RPC
   NEAR_RPC_URL=https://rpc.mainnet.near.org
   
   # CORS (Update with your frontend URL)
   CORS_ORIGIN=*
   ```

4. **Generate Secure Keys**
   ```bash
   # Generate JWT_SECRET (32+ characters)
   openssl rand -base64 32
   
   # Generate JWT_REFRESH_SECRET (32+ characters)
   openssl rand -base64 32
   
   # Generate WALLET_ENCRYPTION_KEY (exactly 32 characters)
   openssl rand -hex 16
   ```

5. **Deploy**
   - Railway will automatically build and deploy
   - Build command: `npm install && npm run build && npm run migrate`
   - Start command: `npm start`

### Option 2: Deploy with Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project or create new
railway link

# Add environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
# ... add all other variables

# Deploy
railway up
```

## Post-Deployment

### 1. Verify Deployment

Check your Railway deployment URL (e.g., `https://your-app.up.railway.app`)

```bash
# Health check
curl https://your-app.up.railway.app/health

# Expected response:
# {"status":"ok","timestamp":"2024-11-25T..."}
```

### 2. Test API Endpoints

```bash
# Register a user
curl -X POST https://your-app.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword123",
    "name": "Test User"
  }'

# Login
curl -X POST https://your-app.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword123"
  }'
```

### 3. Create First Account

```bash
# Use the token from login
curl -X POST https://your-app.up.railway.app/api/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Trading Account",
    "description": "Main index account"
  }'
```

## Database Persistence

Railway provides persistent storage through volumes:

1. Go to your Railway project
2. Click on your service
3. Go to "Settings" → "Volumes"
4. Add a volume:
   - Mount path: `/app/data`
   - Size: 1GB (adjust as needed)

This ensures your SQLite database persists across deployments.

## Monitoring

### View Logs

```bash
# Railway CLI
railway logs

# Or view in Railway dashboard
# Project → Deployments → View Logs
```

### Key Metrics to Monitor

- **API Response Times**: Check `/health` endpoint
- **Database Size**: Monitor `data/index-rebalancer.db`
- **Error Rates**: Check logs for errors
- **Swap Success Rate**: Monitor trade completion

## Scaling

Railway auto-scales based on your plan:

- **Starter Plan**: 512MB RAM, 1 vCPU
- **Pro Plan**: Up to 8GB RAM, 8 vCPU

For high-volume trading:
1. Upgrade to Pro plan
2. Enable horizontal scaling (multiple instances)
3. Consider Redis for session management

## Security Best Practices

### 1. Environment Variables

✅ **DO:**
- Use Railway's environment variables (encrypted at rest)
- Generate unique keys for production
- Rotate keys periodically

❌ **DON'T:**
- Commit `.env` files to Git
- Use default/example keys
- Share keys in plain text

### 2. API Security

```bash
# Enable rate limiting (already configured)
# Update CORS_ORIGIN to your frontend domain
railway variables set CORS_ORIGIN=https://your-frontend.com

# Consider adding API key authentication for external access
```

### 3. Database Backups

```bash
# Automated backups (Railway Pro)
# Or manual backups via CLI
railway run npm run backup
```

## Troubleshooting

### Build Fails

**Issue**: `npm install` fails
```bash
# Check Node.js version in package.json
"engines": {
  "node": ">=18.0.0"
}
```

**Issue**: TypeScript compilation errors
```bash
# Run locally first
npm run build
# Fix any TypeScript errors before deploying
```

### Runtime Errors

**Issue**: Database not found
```bash
# Ensure migration runs on build
# Check railway.json buildCommand includes: npm run migrate
```

**Issue**: Environment variables not loaded
```bash
# Verify all required variables are set in Railway dashboard
railway variables
```

### Performance Issues

**Issue**: Slow API responses
```bash
# Check Railway metrics
# Consider upgrading plan or optimizing queries
```

## CI/CD Pipeline

Railway automatically deploys on every push to `main` branch:

```yaml
# .github/workflows/deploy.yml (optional)
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: |
          npm i -g @railway/cli
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Custom Domain

1. Go to Railway project → Settings → Domains
2. Add custom domain: `api.yourdomain.com`
3. Update DNS records as instructed
4. SSL certificate auto-provisioned

## Cost Estimation

**Starter Plan** (Free tier):
- $5 free credit/month
- ~500 hours runtime
- Perfect for testing

**Pro Plan** ($20/month):
- Unlimited projects
- Priority support
- Custom domains
- Persistent volumes

## Support

- Railway Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- GitHub Issues: https://github.com/armanddid/crypto-index-rebalancer/issues

## Next Steps

After deployment:
1. ✅ Test all API endpoints
2. ✅ Create test index with small amount
3. ✅ Monitor first rebalancing operation
4. ✅ Set up monitoring/alerts
5. ✅ Document API for frontend integration

---

**Deployment Status**: Ready for production! 🚀

**Live API**: `https://your-app.up.railway.app`

**Health Check**: `https://your-app.up.railway.app/health`

