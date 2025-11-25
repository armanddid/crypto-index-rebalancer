import axios from 'axios';
import readline from 'readline';

const BASE_URL = 'http://localhost:3000/api';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Test script for Rebalancing with Existing INTENTS Funds
 * 
 * This assumes you already have funds in your INTENTS account
 */
async function testWithExistingFunds() {
  console.log('========================================');
  console.log('🧪 Testing Rebalancing with Existing Funds');
  console.log('========================================\n');

  try {
    // Step 1: Setup
    console.log('Step 1: Account Setup');
    console.log('----------------------------------------');
    
    const email = `test-existing-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      name: 'Existing Funds Test User',
    });
    const authToken = registerResponse.data.token;
    console.log('✅ User registered and logged in');

    const accountResponse = await axios.post(
      `${BASE_URL}/accounts`,
      { name: 'Existing Funds Test Account' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    const accountId = accountResponse.data.accountId;
    const walletAddress = accountResponse.data.walletAddress;
    
    console.log(`✅ Account created: ${accountId}`);
    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   INTENTS Account: ${walletAddress.toLowerCase()}`);
    console.log('');

    // Step 2: Ask user to confirm they've deposited funds
    console.log('Step 2: Fund Confirmation');
    console.log('----------------------------------------');
    console.log('Please deposit at least 10 USDC to your INTENTS account.');
    console.log('');
    console.log('You can use the deposit endpoint:');
    console.log(`  POST ${BASE_URL}/deposits/${accountId}/address`);
    console.log('');
    console.log('Or deposit to a previous deposit address if you already have one.');
    console.log('');
    
    const confirmed = await askQuestion('Have you deposited funds and they are confirmed in INTENTS? (yes/no): ');
    
    if (confirmed.toLowerCase() !== 'yes') {
      console.log('\nPlease deposit funds first, then run this test again.');
      rl.close();
      return;
    }

    console.log('\n✅ Proceeding with test...\n');
    rl.close();

    // Step 3: Create Index
    console.log('Step 3: Create Index');
    console.log('----------------------------------------');
    
    const createIndexResponse = await axios.post(
      `${BASE_URL}/indexes`,
      {
        accountId,
        name: 'Real Funds Test Index',
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
    console.log(`   Name: ${createIndexResponse.data.index.name}`);
    console.log(`   Status: ${createIndexResponse.data.index.status}`);
    console.log(`   Allocations:`);
    createIndexResponse.data.index.allocations.forEach((alloc: any) => {
      console.log(`     - ${alloc.symbol}: ${alloc.percentage}%`);
    });
    console.log('');

    // Step 4: Trigger Initial Portfolio Construction
    console.log('Step 4: Initial Portfolio Construction');
    console.log('----------------------------------------');
    console.log('⏳ Constructing portfolio...');
    console.log('   This will execute real INTENTS-to-INTENTS swaps');
    console.log('   Expected time: 30-60 seconds\n');
    
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
        console.log('   Checking index status...\n');
      } else {
        console.error('❌ Construction failed:', error.response?.data || error.message);
        throw error;
      }
    }

    // Step 5: Check Index Status
    console.log('Step 5: Check Index Status');
    console.log('----------------------------------------');
    
    const getIndexResponse = await axios.get(
      `${BASE_URL}/indexes/${indexId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const indexData = getIndexResponse.data.index;
    console.log(`✅ Index retrieved`);
    console.log(`   Status: ${indexData.status}`);
    console.log(`   Total Value: $${indexData.totalValue || 0}`);
    console.log(`   Total Drift: ${indexData.totalDrift?.toFixed(2) || 0}pp`);
    
    if (indexData.driftAnalysis) {
      console.log(`\n   Drift Analysis:`);
      console.log(`   - Max Drift: ${indexData.driftAnalysis.maxDrift.toFixed(2)}pp`);
      console.log(`   - Total Value: $${indexData.driftAnalysis.totalValue.toFixed(2)}`);
      
      if (indexData.driftAnalysis.allocations) {
        console.log(`\n   Current Allocations:`);
        indexData.driftAnalysis.allocations.forEach((alloc: any) => {
          console.log(`   - ${alloc.symbol}:`);
          console.log(`       Current: ${alloc.currentPercentage.toFixed(2)}% ($${alloc.usdValue.toFixed(2)})`);
          console.log(`       Target:  ${alloc.targetPercentage.toFixed(2)}%`);
          console.log(`       Drift:   ${alloc.drift.toFixed(2)}pp`);
        });
      }
      
      if (indexData.driftAnalysis.rebalancingActions && indexData.driftAnalysis.rebalancingActions.length > 0) {
        console.log(`\n   Rebalancing Actions:`);
        indexData.driftAnalysis.rebalancingActions.forEach((action: any) => {
          console.log(`   - ${action.action} ${action.symbol}: ${action.amountDelta.toFixed(6)} ($${action.usdValue.toFixed(2)})`);
        });
      }
    }
    console.log('');

    // Step 6: Trigger Manual Rebalancing (if needed)
    if (indexData.status === 'ACTIVE' && indexData.driftAnalysis?.maxDrift > 5) {
      console.log('Step 6: Manual Rebalancing');
      console.log('----------------------------------------');
      console.log('⏳ Triggering rebalancing...\n');
      
      try {
        const rebalanceResponse = await axios.post(
          `${BASE_URL}/indexes/${indexId}/rebalance`,
          {},
          { 
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 180000,
          }
        );
        
        console.log('✅ Rebalancing completed!');
        console.log(`   Message: ${rebalanceResponse.data.message}\n`);
      } catch (error: any) {
        if (error.code === 'ECONNABORTED') {
          console.log('⏰ Rebalancing timed out\n');
        } else {
          console.error('❌ Rebalancing failed:', error.response?.data || error.message);
        }
      }
    }

    console.log('========================================');
    console.log('✅ TEST COMPLETE!');
    console.log('========================================\n');

    console.log('📊 Summary:');
    console.log(`  ✅ Account: ${accountId}`);
    console.log(`  ✅ Wallet: ${walletAddress}`);
    console.log(`  ✅ Index: ${indexId}`);
    console.log(`  ✅ Status: ${indexData.status}`);
    console.log(`  ✅ Total Value: $${indexData.totalValue || 0}`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('Details:', error.response.data.details);
    }
    rl.close();
    process.exit(1);
  }
}

// Run test
testWithExistingFunds();

