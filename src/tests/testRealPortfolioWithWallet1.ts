/**
 * Test Real Portfolio Construction with Wallet 1
 * 
 * This script directly uses the database to create an index and execute portfolio construction
 * with Wallet 1's real funds (10 USDC in INTENTS)
 */

import 'dotenv/config';
import db from '../storage/database.js';
import { indexService } from '../services/IndexService.js';
import { createIndex } from '../storage/models/Index.js';
import { logger } from '../utils/logger.js';

const WALLET_1_ACCOUNT_ID = 'acc_034b74cbf5782c0c';

async function testRealPortfolio() {
  console.log('========================================');
  console.log('🧪 Testing Real Portfolio Construction');
  console.log('========================================\n');

  try {
    // Step 1: Find the user who owns Wallet 1's account
    console.log('📝 Step 1: Finding account owner...');
    
    const account = db.prepare(`
      SELECT account_id, user_id, wallet_address
      FROM accounts
      WHERE account_id = ?
    `).get(WALLET_1_ACCOUNT_ID) as any;
    
    if (!account) {
      throw new Error('Wallet 1 account not found');
    }
    
    console.log(`✅ Found account: ${account.account_id}`);
    console.log(`   Wallet: ${account.wallet_address}`);
    console.log(`   User ID: ${account.user_id}`);
    console.log(`   Balance: ~10 USDC in INTENTS`);
    
    // Step 2: Create an index
    console.log('\n📊 Step 2: Creating index...');
    
    const targetAllocation = [
      { symbol: 'BTC', percentage: 50 },
      { symbol: 'ETH', percentage: 30 },
      { symbol: 'USDC', percentage: 20 }
    ];
    
    const rebalancingConfig = {
      method: 'NONE' as const,
      driftThresholdPercent: 5,
      rebalancingIntervalHours: 24,
    };
    
    const riskConfig = {
      maxDrawdownPercent: 20,
      stopLossPercent: 10,
    };
    
    const index = createIndex(
      account.account_id,
      'Real Test Index - Wallet 1',
      'Testing portfolio construction with real funds',
      targetAllocation,
      rebalancingConfig,
      riskConfig
    );
    
    console.log(`✅ Index created: ${index.indexId}`);
    console.log(`   Name: ${index.name}`);
    console.log(`   Target Allocation:`);
    for (const alloc of index.targetAllocation) {
      console.log(`   - ${alloc.symbol}: ${alloc.percentage}%`);
    }
    
    // Step 3: Construct the portfolio
    console.log('\n🔨 Step 3: Constructing portfolio...');
    console.log('   This will execute REAL swaps with 10 USDC:');
    console.log('   - Buy $5 worth of BTC (50%)');
    console.log('   - Buy $3 worth of ETH (30%)');
    console.log('   - Keep $2 in USDC (20%)');
    console.log('');
    
    const result = await indexService.constructInitialPortfolio(index.indexId, 10); // 10 USDC available
    
    console.log('\n✅ Portfolio construction completed!');
    console.log(`   Rebalance ID: ${result.rebalanceId}`);
    console.log(`   Trades executed: ${result.trades.length}`);
    
    if (result.trades.length > 0) {
      console.log('\n📊 Trade Details:');
      for (const trade of result.trades) {
        console.log(`   - ${trade.action.toUpperCase()}: ${trade.amount} ${trade.fromAsset} → ${trade.toAsset}`);
        console.log(`     Status: ${trade.status}`);
        console.log(`     Trade ID: ${trade.tradeId}`);
        if (trade.nearDepositAddress) {
          console.log(`     Deposit Address: ${trade.nearDepositAddress}`);
        }
      }
    }
    
    console.log('\n========================================');
    console.log('📋 Summary');
    console.log('========================================');
    console.log('✅ Index created successfully');
    console.log('✅ Portfolio construction executed');
    console.log(`✅ ${result.trades.length} trades initiated`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Monitor swap status (trades should complete in ~10 seconds)');
    console.log('   2. Verify final portfolio composition on INTENTS explorer');
    console.log(`\n🔗 INTENTS Explorer: https://intents.near.org/account/${account.wallet_address.toLowerCase()}`);
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\n   Stack trace:', error.stack);
    }
  }
}

testRealPortfolio();

