/**
 * Test INTENTS swap with a smaller amount (0.1 USDC)
 * to verify we have funds and the system works
 */

import 'dotenv/config';
import { executeIntentsSwap } from '../integrations/intentsSwapExecutor.js';

// Wallet 1 credentials (10 USDC in INTENTS)
const WALLET_ADDRESS = '0x7c180cACC0b95c160a80Fe1637b0011d651488d4';
const EVM_PRIVATE_KEY = '0x7614647b69c233c650320a817de067bbb367a60b1d0503180ac1cf2cf8f53e7d';

// Asset IDs
const USDC_ASSET_ID = 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';
const BTC_ASSET_ID = 'nep141:nbtc.bridge.near';

async function testSmallSwap() {
  console.log('========================================');
  console.log('🧪 Testing Small INTENTS Swap (0.1 USDC)');
  console.log('========================================\n');

  console.log('EVM Wallet:', WALLET_ADDRESS);
  console.log('INTENTS Account:', WALLET_ADDRESS.toLowerCase());
  console.log('\nSwap: 0.1 USDC → BTC');
  console.log('Amount: 100,000 (0.1 USDC with 6 decimals)\n');

  console.log('📊 Expected Balance: 10 USDC');
  console.log('💰 Swap Amount: 0.1 USDC (1% of balance)');
  console.log('🔗 Check balance: https://intents.near.org/account/' + WALLET_ADDRESS.toLowerCase());
  console.log('');

  try {
    console.log('⏳ Executing swap...\n');

    const result = await executeIntentsSwap({
      evmPrivateKey: EVM_PRIVATE_KEY,
      evmAddress: WALLET_ADDRESS,
      fromAssetId: USDC_ASSET_ID,
      toAssetId: BTC_ASSET_ID,
      amount: '100000', // 0.1 USDC (6 decimals)
      recipientAddress: WALLET_ADDRESS.toLowerCase(),
    });

    console.log('\n✅ Swap completed successfully!');
    console.log('Status:', result.status);
    console.log('Deposit Address:', result.depositAddress);
    console.log('Settlement Tx Hash:', result.depositTxHash);
    console.log('Destination Tx Hash:', result.destinationTxHash);
    console.log('Amount Out:', result.amountOut);

    console.log('\n🔗 View on INTENTS Explorer:');
    console.log(`https://intents.near.org/account/${WALLET_ADDRESS.toLowerCase()}`);

  } catch (error: any) {
    console.error('\n❌ Swap failed:', error.message);
    
    if (error.message.includes('INSUFFICIENT_BALANCE')) {
      console.error('\n💡 This means either:');
      console.error('   1. The wallet has less than 10 USDC');
      console.error('   2. Previous test swaps already used some funds');
      console.error('   3. There\'s a minimum balance requirement');
      console.error('\n🔗 Check actual balance on INTENTS Explorer:');
      console.error(`   https://intents.near.org/account/${WALLET_ADDRESS.toLowerCase()}`);
    }
    
    if (error.stack) {
      console.error('\nStack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

testSmallSwap();

