import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000/api';

async function useSavedAccount() {
  console.log('========================================');
  console.log('🧪 Testing with Saved Account');
  console.log('========================================\n');

  try {
    // Load credentials
    const credentialsPath = path.join(process.cwd(), 'test-account-credentials.json');
    
    if (!fs.existsSync(credentialsPath)) {
      console.error('❌ No saved credentials found!');
      console.log('\nPlease run: npm run test:create-account');
      process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    
    console.log('✅ Loaded saved credentials');
    console.log(`   Account ID: ${credentials.accountId}`);
    console.log(`   Wallet: ${credentials.walletAddress}`);
    console.log(`   INTENTS Account: ${credentials.intentsAccount}\n`);

    // Check if deposit was made
    if (credentials.depositAddress) {
      console.log('Checking deposit status...');
      try {
        const statusResponse = await axios.get(
          `https://1click.chaindefuser.com/swap/status/${credentials.depositAddress}`
        );
        console.log(`✅ Deposit Status: ${statusResponse.data.status}\n`);
        
        if (statusResponse.data.status !== 'SUCCESS') {
          console.log('⚠️  Deposit not yet complete. Please wait and try again.');
          return;
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log('⚠️  Deposit status not found (may have expired or completed)\n');
        }
      }
    }

    // Create index
    console.log('Step 1: Create Index');
    console.log('----------------------------------------');
    
    const createIndexResponse = await axios.post(
      `${BASE_URL}/indexes`,
      {
        accountId: credentials.accountId,
        name: 'Real Funds Test Index',
        allocations: [
          { symbol: 'BTC', percentage: 40 },
          { symbol: 'ETH', percentage: 40 },
          { symbol: 'USDC', percentage: 20 },
        ],
        rebalancingMethod: 'DRIFT',
        driftThresholdPercent: 5,
      },
      { headers: { Authorization: `Bearer ${credentials.authToken}` } }
    );
    
    const indexId = createIndexResponse.data.index.indexId;
    console.log(`✅ Index created: ${indexId}\n`);

    // Construct portfolio
    console.log('Step 2: Construct Portfolio');
    console.log('----------------------------------------');
    console.log('⏳ This will execute real INTENTS swaps...\n');
    
    try {
      const constructResponse = await axios.post(
        `${BASE_URL}/indexes/${indexId}/construct`,
        {},
        { 
          headers: { Authorization: `Bearer ${credentials.authToken}` },
          timeout: 180000,
        }
      );
      
      console.log('✅ Portfolio construction completed!');
      console.log(`   ${constructResponse.data.message}\n`);
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        console.log('⏰ Construction timed out (expected for real trades)\n');
      } else {
        console.log('❌ Construction failed');
        console.log(`   Error: ${error.response?.data?.error || error.message}`);
        if (error.response?.data?.details) {
          console.log(`   Details: ${error.response.data.details}`);
        }
        console.log('');
      }
    }

    // Check status
    console.log('Step 3: Check Index Status');
    console.log('----------------------------------------');
    
    const getIndexResponse = await axios.get(
      `${BASE_URL}/indexes/${indexId}`,
      { headers: { Authorization: `Bearer ${credentials.authToken}` } }
    );
    
    const indexData = getIndexResponse.data.index;
    console.log(`✅ Index Status: ${indexData.status}`);
    console.log(`   Total Value: $${indexData.totalValue || 0}\n`);

    if (indexData.driftAnalysis) {
      console.log('   Drift Analysis:');
      console.log(`   - Max Drift: ${indexData.driftAnalysis.maxDrift.toFixed(2)}pp`);
      console.log(`   - Total Value: $${indexData.driftAnalysis.totalValue.toFixed(2)}\n`);
    }

    console.log('========================================');
    console.log('✅ TEST COMPLETE');
    console.log('========================================');

  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

useSavedAccount();

