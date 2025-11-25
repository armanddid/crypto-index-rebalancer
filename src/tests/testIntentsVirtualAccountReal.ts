// Test script to discover INTENTS virtual account ID (REAL QUOTE)
// Based on: https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api

import dotenv from 'dotenv';
import { nearIntentsClient } from '../integrations/nearIntents.js';
import { QuoteRequest } from '../integrations/nearIntentsTypes.js';

dotenv.config();

async function testIntentsVirtualAccountReal() {
  console.log('========================================');
  console.log('🔍 INTENTS Virtual Account Discovery');
  console.log('(Real Quote - Will Generate Deposit Address)');
  console.log('========================================');
  console.log('');
  console.log('⚠️  WARNING: This will generate a REAL deposit address!');
  console.log('   Do NOT send funds to it unless you want to test!');
  console.log('');

  try {
    const ethAddress = '0x12da58E28A4E45B8ca9b96b01A8d5d8275Be369D';
    
    // Get supported tokens
    const tokens = await nearIntentsClient.getSupportedTokens();
    const usdcEth = tokens.find(t => t.symbol === 'USDC' && t.blockchain === 'eth')!.assetId;
    const ethEth = tokens.find(t => t.symbol === 'ETH' && t.blockchain === 'eth')!.assetId;

    // Test: Real quote with connectedWallets to get virtualChainRecipient
    console.log('========================================');
    console.log('Test: Real Quote with connectedWallets');
    console.log('========================================');
    
    const quote: QuoteRequest = {
      dry: false, // ← REAL QUOTE!
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: usdcEth,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: ethEth,
      amount: '1000000', // 1 USDC (small amount for safety)
      recipient: ethAddress,
      recipientType: 'DESTINATION_CHAIN',
      refundTo: ethAddress,
      refundType: 'ORIGIN_CHAIN',
      connectedWallets: [ethAddress], // ← Provide wallet
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };

    console.log('Request:');
    console.log('  dry: false (REAL QUOTE)');
    console.log('  connectedWallets:', [ethAddress]);
    console.log('  amount: 1 USDC');
    console.log('');

    const result = await nearIntentsClient.requestQuote(quote);
    
    console.log('✅ Quote Response:');
    console.log(`   Deposit Address: ${result.quote.depositAddress}`);
    console.log(`   Amount In: ${result.quote.amountInFormatted} USDC`);
    console.log(`   Amount Out: ${result.quote.amountOutFormatted} ETH`);
    console.log(`   Deadline: ${result.quote.deadline}`);
    console.log('');
    console.log('🔑 INTENTS Account Info:');
    console.log(`   virtualChainRecipient: ${result.quote.virtualChainRecipient || 'NOT PROVIDED'}`);
    console.log(`   virtualChainRefundRecipient: ${result.quote.virtualChainRefundRecipient || 'NOT PROVIDED'}`);
    console.log('');

    if (result.quote.virtualChainRecipient) {
      console.log('========================================');
      console.log('🎉 SUCCESS! Found INTENTS Account ID');
      console.log('========================================');
      console.log('');
      console.log(`INTENTS Account: ${result.quote.virtualChainRecipient}`);
      console.log('');
      console.log('This is the address to use for:');
      console.log('- recipient when recipientType: INTENTS');
      console.log('- refundTo when refundType: INTENTS');
      console.log('- All INTENTS-to-INTENTS rebalancing swaps');
      console.log('');
    } else {
      console.log('========================================');
      console.log('❌ virtualChainRecipient NOT in response');
      console.log('========================================');
      console.log('');
      console.log('Possible reasons:');
      console.log('1. Field only provided when using INTENTS mode');
      console.log('2. Need to request with recipientType: INTENTS');
      console.log('3. May need JWT authentication');
      console.log('');
      console.log('Full quote object:');
      console.log(JSON.stringify(result.quote, null, 2));
      console.log('');
    }

  } catch (error: any) {
    console.log('========================================');
    console.log('❌ Test Failed');
    console.log('========================================');
    console.log('');
    console.log('Error:', error.message);
    if (error.details) {
      console.log('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

testIntentsVirtualAccountReal();

