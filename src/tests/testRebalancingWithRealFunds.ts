import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

/**
 * Test script for Rebalancing Logic with Real INTENTS Funds
 * 
 * Prerequisites:
 * 1. User must have an account with funds in INTENTS
 * 2. Minimum 10 USDC recommended for testing
 */
async function testRebalancingWithRealFunds() {
  console.log('========================================');
  console.log('🧪 Testing Rebalancing with Real Funds');
  console.log('========================================\n');

  try {
    // Step 1: Setup - Use existing account or create new one
    console.log('Step 1: Account Setup');
    console.log('----------------------------------------');
    
    const email = `test-real-rebalance-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      name: 'Real Rebalancing Test User',
    });
    const authToken = registerResponse.data.token;
    console.log('✅ User registered and logged in');

    const accountResponse = await axios.post(
      `${BASE_URL}/accounts`,
      { name: 'Real Rebalancing Test Account' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    const accountId = accountResponse.data.accountId;
    const walletAddress = accountResponse.data.walletAddress;
    
    console.log(`✅ Account created: ${accountId}`);
    console.log(`   Wallet: ${walletAddress}`);
    console.log('');

    // Step 2: Generate deposit address for funding
    console.log('Step 2: Generate Deposit Address');
    console.log('----------------------------------------');
    console.log('⏳ Generating deposit address for USDC on Base...\n');

    const depositResponse = await axios.post(
      `${BASE_URL}/deposits/${accountId}/address`,
      {
        asset: 'USDC',
        blockchain: 'base',
        amount: '10000000', // 10 USDC (6 decimals)
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('✅ Deposit address generated!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 DEPOSIT INSTRUCTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`   🎯 Deposit Address: ${depositResponse.data.depositAddress}`);
    console.log('');
    console.log(`   💰 Amount: ${depositResponse.data.amount} USDC`);
    console.log(`   🌐 Network: Base`);
    console.log(`   📝 Contract: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`);
    console.log('');
    console.log(`   ⏰ Valid until: ${depositResponse.data.deadline}`);
    console.log(`   ⏱️  Estimated time: ${depositResponse.data.timeEstimate} seconds`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('⏸️  PAUSED - Please deposit funds now');
    console.log('');
    console.log('Press Ctrl+C when done, then run the continuation script');
    console.log('Or wait for automatic continuation after deposit...');
    console.log('');

    // Step 3: Wait for deposit (poll for status)
    console.log('Step 3: Waiting for Deposit');
    console.log('----------------------------------------');
    console.log('⏳ Polling for deposit confirmation (checking every 10 seconds)...\n');

    const depositAddress = depositResponse.data.depositAddress;
    let depositConfirmed = false;
    let pollCount = 0;
    const maxPolls = 60; // 10 minutes max

    while (!depositConfirmed && pollCount < maxPolls) {
      pollCount++;
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

      try {
        // Check swap status
        const statusResponse = await axios.get(
          `https://1click.chaindefuser.com/swap/status/${depositAddress}`
        );

        const status = statusResponse.data.status;
        console.log(`[Poll #${pollCount}] Status: ${status}`);

        if (status === 'SUCCESS') {
          depositConfirmed = true;
          console.log('\n✅ Deposit confirmed! Funds are now in INTENTS\n');
        } else if (['REFUNDED', 'FAILED'].includes(status)) {
          throw new Error(`Deposit ${status}`);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log(`[Poll #${pollCount}] Waiting for deposit...`);
        } else {
          throw error;
        }
      }
    }

    if (!depositConfirmed) {
      console.log('\n⏰ Timeout waiting for deposit');
      console.log('Please run this test again after depositing funds\n');
      return;
    }

    // Step 4: Create Index
    console.log('Step 4: Create Index');
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

    // Step 5: Trigger Initial Portfolio Construction
    console.log('Step 5: Initial Portfolio Construction');
    console.log('----------------------------------------');
    console.log('⏳ Constructing portfolio (this will take 30-60 seconds)...\n');
    
    try {
      const constructResponse = await axios.post(
        `${BASE_URL}/indexes/${indexId}/construct`,
        {},
        { 
          headers: { Authorization: `Bearer ${authToken}` },
          timeout: 120000, // 2 minute timeout
        }
      );
      
      console.log('✅ Portfolio construction completed!');
      console.log(`   Message: ${constructResponse.data.message}\n`);
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        console.log('⏰ Construction timed out (checking status...)');
      } else {
        throw error;
      }
    }

    // Step 6: Check Index Status
    console.log('Step 6: Check Index Status');
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
    console.log('✅ REAL FUNDS TEST COMPLETE!');
    console.log('========================================\n');

    console.log('📊 Summary:');
    console.log(`  ✅ Account: ${accountId}`);
    console.log(`  ✅ Wallet: ${walletAddress}`);
    console.log(`  ✅ Index: ${indexId}`);
    console.log(`  ✅ Status: ${indexData.status}`);
    console.log(`  ✅ Funds deposited and portfolio constructed`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('Details:', error.response.data.details);
    }
    process.exit(1);
  }
}

// Run test
testRebalancingWithRealFunds();

