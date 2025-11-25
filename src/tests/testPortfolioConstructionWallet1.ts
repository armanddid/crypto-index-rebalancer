/**
 * Test Portfolio Construction with Wallet 1 (Real Funds)
 * 
 * This test uses Wallet 1 which has 10 USDC in INTENTS to construct a real portfolio
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';

const API_BASE_URL = 'http://localhost:3000/api';
const WALLET_1_ADDRESS = '0x7c180cACC0b95c160a80Fe1637b0011d651488d4';
const WALLET_1_ACCOUNT_ID = 'acc_034b74cbf5782c0c';

async function testPortfolioConstruction() {
  console.log('========================================');
  console.log('🧪 Testing Portfolio Construction with Wallet 1');
  console.log('========================================\n');

  try {
    // Step 1: Get admin data to find the user for this account
    console.log('📝 Step 1: Getting account details...');
    const adminResponse = await axios.get(`${API_BASE_URL}/admin/wallets`);
    const wallet1Data = adminResponse.data.wallets.find(
      (w: any) => w.accountId === WALLET_1_ACCOUNT_ID
    );
    
    if (!wallet1Data) {
      throw new Error('Wallet 1 not found');
    }
    
    console.log(`✅ Found Wallet 1: ${wallet1Data.walletAddress}`);
    console.log(`   INTENTS Account: ${wallet1Data.intentsAccount}`);
    console.log(`   Balance: ~10 USDC`);
    
    // Step 2: Get or create a user for testing
    console.log('\n📝 Step 2: Setting up test user...');
    
    // Register a test user
    const testEmail = `test-wallet1-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        email: testEmail,
        password: testPassword,
        name: 'Wallet 1 Test User',
      });
      console.log(`✅ Test user created: ${testEmail}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log(`✅ Test user already exists: ${testEmail}`);
      } else {
        throw error;
      }
    }
    
    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });
    
    const token = loginResponse.data.token;
    console.log(`✅ Logged in successfully`);
    
    // Step 3: Link Wallet 1 to this user by creating a matching account
    // Since we can't directly assign an existing account to a new user,
    // we'll need to use the existing account's user or create a workaround
    
    // For now, let's just create a new account and fund it
    console.log('\n💰 Step 3: Creating account for test user...');
    console.log('   Note: This will create a NEW wallet, not use Wallet 1');
    console.log('   For a real test with Wallet 1, we need to find its owner user');
    
    const accountResponse = await axios.post(
      `${API_BASE_URL}/accounts`,
      { name: 'Test Account' },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    const newAccountId = accountResponse.data.account.accountId;
    const newWalletAddress = accountResponse.data.account.walletAddress;
    console.log(`✅ Account created: ${newAccountId}`);
    console.log(`   Wallet Address: ${newWalletAddress}`);
    console.log(`   ⚠️  This wallet needs to be funded with USDC in INTENTS`);
    console.log(`   ⚠️  Skipping portfolio construction as this wallet is not funded`);
    
    console.log('\n========================================');
    console.log('📋 Summary');
    console.log('========================================');
    console.log('✅ Test user created and authenticated');
    console.log('✅ New account created');
    console.log('⚠️  Cannot use Wallet 1 without its owner user');
    console.log('\n💡 To test with Wallet 1:');
    console.log('   1. Find the user_id that owns account acc_034b74cbf5782c0c');
    console.log('   2. Login as that user');
    console.log('   3. Create an index with that account');
    console.log('\n🔗 New Wallet: ' + newWalletAddress);
    return;
    
    // Step 4: Create an index
    console.log('\n📊 Step 4: Creating test index...');
    
    const indexConfig = {
      name: 'Test Index - Wallet 1',
      accountId: newAccountId,
      allocations: [
        { symbol: 'BTC', percentage: 50 },
        { symbol: 'ETH', percentage: 30 },
        { symbol: 'USDC', percentage: 20 }
      ],
      rebalancingMethod: 'NONE'
    };
    
    const indexResponse = await axios.post(
      `${API_BASE_URL}/indexes`,
      indexConfig,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    const index = indexResponse.data.index;
    console.log(`✅ Index created: ${index.indexId}`);
    console.log(`   Name: ${index.name}`);
    console.log(`   Assets: ${index.targetAllocation.length}`);
    
    // Step 4: Construct the portfolio
    console.log('\n🔨 Step 4: Constructing portfolio...');
    console.log('   This will execute real swaps with the 10 USDC in INTENTS');
    console.log('   Target allocation:');
    console.log('   - BTC: 50% ($5)');
    console.log('   - ETH: 30% ($3)');
    console.log('   - USDC: 20% ($2)');
    console.log('');
    
    const constructResponse = await axios.post(
      `${API_BASE_URL}/indexes/${index.indexId}/construct`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    console.log('\n✅ Portfolio construction initiated!');
    console.log(`   Rebalance ID: ${constructResponse.data.rebalanceId}`);
    console.log(`   Trades: ${constructResponse.data.trades?.length || 0}`);
    
    if (constructResponse.data.trades && constructResponse.data.trades.length > 0) {
      console.log('\n📊 Trade Details:');
      for (const trade of constructResponse.data.trades) {
        console.log(`   - ${trade.action.toUpperCase()}: ${trade.amount} ${trade.fromAsset} → ${trade.toAsset}`);
        console.log(`     Status: ${trade.status}`);
        console.log(`     Trade ID: ${trade.tradeId}`);
      }
    }
    
    console.log('\n========================================');
    console.log('📋 Summary');
    console.log('========================================');
    console.log('✅ Test user created and authenticated');
    console.log('✅ Index created with Wallet 1 account');
    console.log('✅ Portfolio construction executed');
    console.log('\n💡 Next Steps:');
    console.log('   1. Monitor swap status on INTENTS explorer');
    console.log('   2. Verify final portfolio composition');
    console.log('   3. Check that all swaps completed successfully');
    console.log(`\n🔗 INTENTS Explorer: https://intents.near.org/account/${wallet1Data.intentsAccount}`);
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('   API Error:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack) {
      console.error('\n   Stack trace:', error.stack);
    }
  }
}

testPortfolioConstruction();

