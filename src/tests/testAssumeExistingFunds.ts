import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

/**
 * Test script for Rebalancing - Assumes funds are already in INTENTS
 * 
 * This test will:
 * 1. Create a new account
 * 2. Create an index
 * 3. Attempt to construct the portfolio (will work if funds are in INTENTS)
 */
async function testAssumeExistingFunds() {
  console.log('========================================');
  console.log('🧪 Testing Rebalancing (Assuming Funds in INTENTS)');
  console.log('========================================\n');

  console.log('⚠️  NOTE: This test assumes you have already deposited');
  console.log('   at least 10 USDC to the INTENTS account for this wallet.\n');

  try {
    // Step 1: Setup
    console.log('Step 1: Account Setup');
    console.log('----------------------------------------');
    
    const email = `test-assume-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      name: 'Assume Funds Test User',
    });
    const authToken = registerResponse.data.token;
    console.log('✅ User registered and logged in');

    const accountResponse = await axios.post(
      `${BASE_URL}/accounts`,
      { name: 'Assume Funds Test Account' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    const accountId = accountResponse.data.accountId;
    const walletAddress = accountResponse.data.walletAddress;
    
    console.log(`✅ Account created: ${accountId}`);
    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   INTENTS Account: ${walletAddress.toLowerCase()}`);
    console.log('');

    console.log('💡 To deposit funds to this account:');
    console.log(`   1. Use the deposit endpoint to get a deposit address`);
    console.log(`   2. Send 10+ USDC on Base to that address`);
    console.log(`   3. Wait for confirmation (~35 seconds)`);
    console.log(`   4. Then the portfolio construction will work\n`);

    // Step 2: Create Index
    console.log('Step 2: Create Index');
    console.log('----------------------------------------');
    
    const createIndexResponse = await axios.post(
      `${BASE_URL}/indexes`,
      {
        accountId,
        name: 'Test Crypto Index',
        allocations: [
          { symbol: 'BTC', percentage: 40 },
          { symbol: 'ETH', percentage: 40 },
          { symbol: 'USDC', percentage: 20 },
        ],
        rebalancingMethod: 'DRIFT',
        driftThresholdPercent: 5,
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const indexId = createIndexResponse.data.index.indexId;
    console.log(`✅ Index created: ${indexId}`);
    console.log(`   Status: ${createIndexResponse.data.index.status}\n`);

    // Step 3: Trigger Initial Portfolio Construction
    console.log('Step 3: Initial Portfolio Construction');
    console.log('----------------------------------------');
    console.log('⏳ Attempting to construct portfolio...');
    console.log('   (This will only work if funds are in INTENTS)\n');
    
    try {
      const constructResponse = await axios.post(
        `${BASE_URL}/indexes/${indexId}/construct`,
        {},
        { 
          headers: { Authorization: `Bearer ${authToken}` },
          timeout: 180000, // 3 minute timeout
        }
      );
      
      console.log('✅ Portfolio construction completed!');
      console.log(`   Message: ${constructResponse.data.message}\n`);
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        console.log('⏰ Construction timed out');
        console.log('   This is expected for real trades\n');
      } else if (error.response?.status === 500) {
        console.log('❌ Construction failed');
        console.log(`   Error: ${error.response.data.error}`);
        if (error.response.data.details) {
          console.log(`   Details: ${error.response.data.details}`);
        }
        console.log('\n💡 This likely means there are no funds in the INTENTS account.');
        console.log('   Please deposit funds first using the deposit endpoint.\n');
      } else {
        throw error;
      }
    }

    // Step 4: Check Index Status
    console.log('Step 4: Check Index Status');
    console.log('----------------------------------------');
    
    const getIndexResponse = await axios.get(
      `${BASE_URL}/indexes/${indexId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const indexData = getIndexResponse.data.index;
    console.log(`✅ Index Status: ${indexData.status}`);
    console.log(`   Total Value: $${indexData.totalValue || 0}`);
    
    if (indexData.driftAnalysis) {
      console.log(`\n   Drift Analysis:`);
      console.log(`   - Max Drift: ${indexData.driftAnalysis.maxDrift.toFixed(2)}pp`);
      console.log(`   - Total Value: $${indexData.driftAnalysis.totalValue.toFixed(2)}`);
      
      if (indexData.driftAnalysis.allocations) {
        console.log(`\n   Current Allocations:`);
        indexData.driftAnalysis.allocations.forEach((alloc: any) => {
          console.log(`   - ${alloc.symbol}: ${alloc.currentPercentage.toFixed(2)}% (target: ${alloc.targetPercentage}%)`);
        });
      }
    }
    console.log('');

    console.log('========================================');
    console.log('✅ TEST COMPLETE');
    console.log('========================================\n');

    console.log('📊 Summary:');
    console.log(`  Account: ${accountId}`);
    console.log(`  Wallet: ${walletAddress}`);
    console.log(`  Index: ${indexId}`);
    console.log(`  Status: ${indexData.status}`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('Details:', error.response.data.details);
    }
    process.exit(1);
  }
}

// Run test
testAssumeExistingFunds();

