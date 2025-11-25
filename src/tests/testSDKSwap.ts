/**
 * Test INTENTS swap using Intents SDK + 1-Click API
 * 
 * This test verifies that we can execute INTENTS-to-INTENTS swaps using:
 * 1. 1-Click API for quotes
 * 2. Intents SDK for signing and sending custom intents with EVM wallet
 * 
 * Solution confirmed by NEAR Intents team:
 * - Get quote from 1-Click API (provides deposit address)
 * - Use sdk.signAndSendIntent() with custom "transfer" intent
 * - Transfer tokens to the deposit address via the intent
 * 
 * Docs: https://www.npmjs.com/package/@defuse-protocol/intents-sdk
 */

import 'dotenv/config';
import { executeIntentsSwap } from '../integrations/intentsSwapExecutor.js';

// Wallet 1 credentials (10 USDC in INTENTS)
const WALLET_ADDRESS = '0x7c180cACC0b95c160a80Fe1637b0011d651488d4';
const EVM_PRIVATE_KEY = '0x7614647b69c233c650320a817de067bbb367a60b1d0503180ac1cf2cf8f53e7d';

// Asset IDs
const USDC_ASSET_ID = 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';
const BTC_ASSET_ID = 'nep141:nbtc.bridge.near';

async function testSDKSwap() {
  console.log('========================================');
  console.log('🧪 Testing INTENTS Swap with SDK + 1-Click API');
  console.log('========================================\n');

  console.log('EVM Wallet:', WALLET_ADDRESS);
  console.log('INTENTS Account:', WALLET_ADDRESS.toLowerCase());
  console.log('\nSwap: 1 USDC → BTC');
  console.log('Method: SDK signAndSendIntent + 1-Click API\n');

  try {
    console.log('⏳ Executing swap...\n');

    const result = await executeIntentsSwap({
      evmPrivateKey: EVM_PRIVATE_KEY,
      evmAddress: WALLET_ADDRESS,
      fromAssetId: USDC_ASSET_ID,
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

  } catch (error: any) {
    console.error('\n❌ Swap failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

testSDKSwap();

