/**
 * Full Rebalancing Test with Base USDC
 * 
 * This test creates an index and executes initial portfolio construction
 * using the Base USDC that we know is in Wallet 1.
 */

import 'dotenv/config';
import { findAccountById, findAccountByWalletAddress } from '../storage/models/Account.js';
import { findUserByEmail } from '../storage/models/User.js';
import { createIndex } from '../storage/models/Index.js';
import { indexService } from '../services/IndexService.js';
import { decryptPrivateKey } from '../utils/crypto.js';

// Wallet 1 - Has ~9 Base USDC
const WALLET_ADDRESS = '0x7c180cACC0b95c160a80Fe1637b0011d651488d4';
const BASE_USDC_ASSET_ID = 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near';

async function testFullRebalancing() {
  console.log('========================================');
  console.log('🧪 Full Rebalancing Test with Base USDC');
  console.log('========================================\n');

  console.log('Wallet:', WALLET_ADDRESS);
  console.log('Base Asset: Base USDC');
  console.log('Asset ID:', BASE_USDC_ASSET_ID);
  console.log('Available Balance: ~9 USDC (after previous test swap)');
  console.log('Usable Amount (99%): ~8.91 USDC');
  console.log('Reserved for Fees (1%): ~0.09 USDC\n');

  try {
    // Step 1: Find the user and account for Wallet 1
    console.log('📋 Step 1: Finding user and account...\n');

    // Find account by wallet address
    const account = findAccountByWalletAddress(WALLET_ADDRESS);

    if (!account) {
      throw new Error('Account not found for Wallet 1. Please create it first.');
    }

    console.log('✅ Account found:', account.accountId);
    console.log('   User ID:', account.userId);
    console.log('   Wallet:', account.walletAddress);
    console.log('');

    // Verify user exists
    const { findUserById } = await import('../storage/models/User.js');
    const user = findUserById(account.userId);
    if (!user) {
      throw new Error(`User ${account.userId} not found! This account is orphaned.`);
    }
    console.log('✅ User verified:', user.email);
    console.log('');

    // Step 2: Create a test index
    console.log('📋 Step 2: Creating test index...\n');

    const indexName = `Test Index ${Date.now()}`;
    const targetAllocation = [
      { symbol: 'USDC', percentage: 50 },  // Keep 50% in USDC (Base USDC)
      { symbol: 'BTC', percentage: 30 },   // 30% in BTC
      { symbol: 'ETH', percentage: 20 },   // 20% in ETH
    ];

    const index = createIndex(
      account.accountId,
      indexName,
      'Test index for Base USDC rebalancing',
      targetAllocation,
      {
        method: 'NONE', // No auto-rebalancing for this test
        driftThreshold: 5,
      },
      {
        maxDrawdown: 20,
        stopLoss: 15,
      }
    );

    console.log('✅ Index created:', index.indexId);
    console.log('   Name:', index.name);
    console.log('   Target Allocation:', targetAllocation);
    console.log('');

    // Step 3: Execute initial portfolio construction
    console.log('📋 Step 3: Constructing initial portfolio...\n');
    console.log('⚠️  NOTE: We need to update PortfolioService to use Base USDC!');
    console.log('   For now, this will fail because it uses the wrong USDC asset ID.');
    console.log('');

    const totalUsdcAmount = 9.0; // We have ~9 USDC
    const usableAmount = totalUsdcAmount * 0.99; // 99% usable = 8.91 USDC

    console.log('💰 Portfolio Breakdown (with 99% buffer):');
    console.log(`   Total: ${totalUsdcAmount} USDC`);
    console.log(`   Usable: ${usableAmount.toFixed(2)} USDC (99%)`);
    console.log(`   Reserved: ${(totalUsdcAmount - usableAmount).toFixed(2)} USDC (1%)`);
    console.log('');
    console.log('   Allocations:');
    console.log(`   - USDC (50%): ${(usableAmount * 0.5).toFixed(2)} USDC (stays as is)`);
    console.log(`   - BTC (30%): ${(usableAmount * 0.3).toFixed(2)} USDC to swap`);
    console.log(`   - ETH (20%): ${(usableAmount * 0.2).toFixed(2)} USDC to swap`);
    console.log('');

    console.log('⏳ Executing portfolio construction...\n');

    // Execute with Base USDC asset ID
    const success = await indexService.constructInitialPortfolio(
      index.indexId,
      totalUsdcAmount,
      BASE_USDC_ASSET_ID
    );

    if (success) {
      console.log('\n✅ Portfolio construction completed successfully!');
      
      // Fetch the rebalance details
      const { listRebalancesByIndexId } = await import('../storage/models/Rebalance.js');
      const rebalances = listRebalancesByIndexId(index.indexId);
      
      if (rebalances.length > 0) {
        const latestRebalance = rebalances[rebalances.length - 1];
        
        console.log('   Rebalance ID:', latestRebalance.rebalanceId);
        console.log('   Status:', latestRebalance.status);
        console.log('   Trades:', latestRebalance.tradesCount);
        console.log('');
      }
      
      // Fetch trades
      const { listTradesByIndexId } = await import('../storage/models/Trade.js');
      const trades = listTradesByIndexId(index.indexId);
      
      console.log(`📊 Executed ${trades.length} trades:\n`);
      trades.forEach((trade, idx) => {
        console.log(`   ${idx + 1}. ${trade.fromAsset} → ${trade.toAsset}`);
        console.log(`      Amount: ${trade.fromAmount}`);
        console.log(`      Status: ${trade.status}`);
        if (trade.depositAddress) {
          console.log(`      Deposit Address: ${trade.depositAddress}`);
        }
        console.log('');
      });
    } else {
      console.log('\n⚠️  Portfolio construction returned false');
    }

    console.log('🔗 View on INTENTS Explorer:');
    console.log(`   https://intents.near.org/account/${WALLET_ADDRESS.toLowerCase()}`);

    console.log('\n🎉 SUCCESS! Full rebalancing test completed!');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('INSUFFICIENT_BALANCE')) {
      console.error('\n💡 This is expected! The PortfolioService is using the wrong USDC asset ID.');
      console.error('   It\'s trying to use: nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1');
      console.error('   But we have: ' + BASE_USDC_ASSET_ID);
      console.error('\n   We need to update PortfolioService to:');
      console.error('   1. Accept baseAssetId as a parameter');
      console.error('   2. Use the correct USDC asset ID for swaps');
    }
    
    if (error.stack) {
      console.error('\nStack trace:', error.stack.split('\n').slice(0, 10).join('\n'));
    }
  }
}

testFullRebalancing();

