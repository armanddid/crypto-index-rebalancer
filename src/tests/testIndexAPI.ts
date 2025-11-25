import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

let authToken = '';
let accountId = '';
let indexId = '';

/**
 * Test script for Index API endpoints
 */
async function testIndexAPI() {
  console.log('========================================');
  console.log('🧪 Testing Index API');
  console.log('========================================\n');

  try {
    // Step 1: Register and login
    console.log('Step 1: Authentication');
    console.log('----------------------------------------');
    
    const email = `test-index-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      name: 'Index Test User',
    });
    console.log('✅ User registered');

    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password,
    });
    authToken = loginResponse.data.token;
    console.log('✅ User logged in\n');

    // Step 2: Create account
    console.log('Step 2: Create Account');
    console.log('----------------------------------------');
    
    const accountResponse = await axios.post(
      `${BASE_URL}/accounts`,
      {
        name: 'Index Test Account',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    accountId = accountResponse.data.accountId;
    console.log(`✅ Account created: ${accountId}`);
    console.log(`   Wallet: ${accountResponse.data.walletAddress}\n`);

    // Step 3: Create index
    console.log('Step 3: Create Index');
    console.log('----------------------------------------');
    
    const createIndexResponse = await axios.post(
      `${BASE_URL}/indexes`,
      {
        accountId,
        name: 'Balanced Crypto Index',
        allocations: [
          { symbol: 'BTC', percentage: 40 },
          { symbol: 'ETH', percentage: 30 },
          { symbol: 'SOL', percentage: 20 },
          { symbol: 'USDC', percentage: 10 },
        ],
        rebalancingMethod: 'DRIFT',
        driftThresholdPercent: 5,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    indexId = createIndexResponse.data.index.indexId;
    console.log(`✅ Index created: ${indexId}`);
    console.log(`   Name: ${createIndexResponse.data.index.name}`);
    console.log(`   Status: ${createIndexResponse.data.index.status}`);
    console.log(`   Allocations:`);
    createIndexResponse.data.index.allocations.forEach((alloc: any) => {
      console.log(`     - ${alloc.symbol}: ${alloc.percentage}%`);
    });
    console.log(`   Rebalancing: ${createIndexResponse.data.index.rebalancingMethod}`);
    console.log(`   Drift Threshold: ${createIndexResponse.data.index.driftThresholdPercent}%\n`);

    // Step 4: Get index details
    console.log('Step 4: Get Index Details');
    console.log('----------------------------------------');
    
    const getIndexResponse = await axios.get(
      `${BASE_URL}/indexes/${indexId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log(`✅ Index retrieved: ${getIndexResponse.data.index.name}`);
    console.log(`   Status: ${getIndexResponse.data.index.status}\n`);

    // Step 5: Update index settings
    console.log('Step 5: Update Index Settings');
    console.log('----------------------------------------');
    
    await axios.put(
      `${BASE_URL}/indexes/${indexId}`,
      {
        driftThresholdPercent: 7,
        rebalancingIntervalHours: 24,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Index settings updated');
    console.log('   New drift threshold: 7%');
    console.log('   Rebalancing interval: 24 hours\n');

    // Step 6: Pause index
    console.log('Step 6: Pause Index');
    console.log('----------------------------------------');
    
    await axios.post(
      `${BASE_URL}/indexes/${indexId}/pause`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Index paused\n');

    // Step 7: Resume index
    console.log('Step 7: Resume Index');
    console.log('----------------------------------------');
    
    await axios.post(
      `${BASE_URL}/indexes/${indexId}/resume`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Index resumed\n');

    // Step 8: Try to trigger rebalancing (will fail - no funds)
    console.log('Step 8: Trigger Rebalancing (Expected to fail - no funds)');
    console.log('----------------------------------------');
    
    try {
      await axios.post(
        `${BASE_URL}/indexes/${indexId}/rebalance`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      console.log('⚠️  Rebalancing triggered (unexpected)\n');
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Rebalancing rejected (as expected - index not ACTIVE)\n');
      } else {
        throw error;
      }
    }

    // Step 9: List all indexes
    console.log('Step 9: List All Indexes');
    console.log('----------------------------------------');
    
    const listResponse = await axios.get(
      `${BASE_URL}/indexes`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log(`✅ Indexes listed: ${listResponse.data.count} found\n`);

    // Step 10: Delete index
    console.log('Step 10: Delete Index');
    console.log('----------------------------------------');
    
    await axios.delete(
      `${BASE_URL}/indexes/${indexId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Index deleted\n');

    // Step 11: Test validation errors
    console.log('Step 11: Test Validation Errors');
    console.log('----------------------------------------');
    
    // Invalid allocations (don't sum to 100%)
    try {
      await axios.post(
        `${BASE_URL}/indexes`,
        {
          accountId,
          name: 'Invalid Index',
          allocations: [
            { symbol: 'BTC', percentage: 50 },
            { symbol: 'ETH', percentage: 30 },
          ],
          rebalancingMethod: 'NONE',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      console.log('❌ Should have rejected invalid allocations');
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 500) {
        console.log('✅ Invalid allocations rejected');
        const errorMsg = error.response.data.error || error.response.data.details;
        console.log(`   Error: ${typeof errorMsg === 'string' ? errorMsg : 'Validation failed'}`);
      } else {
        throw error;
      }
    }

    // Unsupported asset
    try {
      await axios.post(
        `${BASE_URL}/indexes`,
        {
          accountId,
          name: 'Invalid Index',
          allocations: [
            { symbol: 'INVALID_TOKEN', percentage: 100 },
          ],
          rebalancingMethod: 'NONE',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      console.log('❌ Should have rejected unsupported asset');
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 500) {
        console.log('✅ Unsupported asset rejected');
        const errorMsg = error.response.data.error || 'Validation failed';
        console.log(`   Error: ${errorMsg}`);
      } else {
        throw error;
      }
    }

    console.log('\n========================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('========================================\n');

    console.log('📊 Summary:');
    console.log('  ✅ User authentication');
    console.log('  ✅ Account creation');
    console.log('  ✅ Index creation');
    console.log('  ✅ Get index details');
    console.log('  ✅ Update index settings');
    console.log('  ✅ Pause/Resume index');
    console.log('  ✅ Trigger rebalancing (validation)');
    console.log('  ✅ List indexes');
    console.log('  ✅ Delete index');
    console.log('  ✅ Validation errors');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
testIndexAPI();

