/**
 * Test INTENTS swap using Base USDC
 * 
 * Base USDC Asset ID: nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near
 */

import 'dotenv/config';
import { executeIntentsSwap } from '../integrations/intentsSwapExecutor.js';

// Wallet 1 credentials (10 USDC from Base in INTENTS)
const WALLET_ADDRESS = '0x7c180cACC0b95c160a80Fe1637b0011d651488d4';
const EVM_PRIVATE_KEY = '0x7614647b69c233c650320a817de067bbb367a60b1d0503180ac1cf2cf8f53e7d';

// Asset IDs - Using Base USDC
const BASE_USDC_ASSET_ID = 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near';
const BTC_ASSET_ID = 'nep141:nbtc.bridge.near';

async function testBaseUSDCSwap() {
  console.log('========================================');
  console.log('🧪 Testing INTENTS Swap with Base USDC');
  console.log('========================================\n');

  console.log('EVM Wallet:', WALLET_ADDRESS);
  console.log('INTENTS Account:', WALLET_ADDRESS.toLowerCase());
  console.log('\nAsset: Base USDC');
  console.log('Asset ID:', BASE_USDC_ASSET_ID);
  console.log('\nSwap: 1 Base USDC → BTC');
  console.log('Amount: 1,000,000 (1 USDC with 6 decimals)\n');

  console.log('🔗 Check balance: https://intents.near.org/account/' + WALLET_ADDRESS.toLowerCase());
  console.log('');

  try {
    console.log('⏳ Executing swap...\n');

    const result = await executeIntentsSwap({
      evmPrivateKey: EVM_PRIVATE_KEY,
      evmAddress: WALLET_ADDRESS,
      fromAssetId: BASE_USDC_ASSET_ID,
      toAssetId: BTC_ASSET_ID,
      amount: '1000000', // 1 USDC (6 decimals)
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

    console.log('\n🎉 SUCCESS! INTENTS-to-INTENTS swap is working!');

  } catch (error: any) {
    console.error('\n❌ Swap failed:', error.message);
    
    if (error.message.includes('INSUFFICIENT_BALANCE')) {
      console.error('\n💡 Still insufficient balance with Base USDC.');
      console.error('   Please check the INTENTS Explorer to verify:');
      console.error('   1. What USDC tokens are in the wallet');
      console.error('   2. The exact asset IDs');
      console.error('   3. The actual balances');
      console.error('\n🔗 INTENTS Explorer:');
      console.error(`   https://intents.near.org/account/${WALLET_ADDRESS.toLowerCase()}`);
    }
    
    if (error.stack) {
      console.error('\nStack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

testBaseUSDCSwap();

