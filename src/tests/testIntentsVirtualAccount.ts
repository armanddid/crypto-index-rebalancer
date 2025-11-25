// Test script to discover INTENTS virtual account ID
// Based on: https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api

import dotenv from 'dotenv';
import { nearIntentsClient } from '../integrations/nearIntents.js';
import { QuoteRequest } from '../integrations/nearIntentsTypes.js';

dotenv.config();

async function testIntentsVirtualAccount() {
  console.log('========================================');
  console.log('🔍 INTENTS Virtual Account Discovery');
  console.log('========================================');
  console.log('');
  console.log('Goal: Find the virtualChainRecipient for INTENTS mode');
  console.log('');

  try {
    const ethAddress = '0x12da58E28A4E45B8ca9b96b01A8d5d8275Be369D';
    
    // Get supported tokens
    const tokens = await nearIntentsClient.getSupportedTokens();
    const usdcEth = tokens.find(t => t.symbol === 'USDC' && t.blockchain === 'eth')!.assetId;
    const ethEth = tokens.find(t => t.symbol === 'ETH' && t.blockchain === 'eth')!.assetId;

    // Test 1: Request with connectedWallets
    console.log('========================================');
    console.log('Test 1: With connectedWallets');
    console.log('========================================');
    
    const quote1: QuoteRequest = {
      dry: true,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: usdcEth,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: ethEth,
      amount: '1000000000',
      recipient: ethAddress,
      recipientType: 'DESTINATION_CHAIN',
      refundTo: ethAddress,
      refundType: 'ORIGIN_CHAIN',
      connectedWallets: [ethAddress], // ← Provide wallet
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };

    console.log('Request with connectedWallets:', [ethAddress]);
    console.log('');

    const result1 = await nearIntentsClient.requestQuote(quote1);
    
    console.log('✅ Quote Response:');
    console.log(`   virtualChainRecipient: ${result1.quote.virtualChainRecipient || 'NOT PROVIDED'}`);
    console.log(`   virtualChainRefundRecipient: ${result1.quote.virtualChainRefundRecipient || 'NOT PROVIDED'}`);
    console.log('');

    // Test 2: Request with sessionId
    console.log('========================================');
    console.log('Test 2: With sessionId');
    console.log('========================================');
    
    const sessionId = `session_${ethAddress.toLowerCase()}`;
    
    const quote2: QuoteRequest = {
      dry: true,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: usdcEth,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: ethEth,
      amount: '1000000000',
      recipient: ethAddress,
      recipientType: 'DESTINATION_CHAIN',
      refundTo: ethAddress,
      refundType: 'ORIGIN_CHAIN',
      sessionId, // ← Provide session
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };

    console.log('Request with sessionId:', sessionId);
    console.log('');

    const result2 = await nearIntentsClient.requestQuote(quote2);
    
    console.log('✅ Quote Response:');
    console.log(`   virtualChainRecipient: ${result2.quote.virtualChainRecipient || 'NOT PROVIDED'}`);
    console.log(`   virtualChainRefundRecipient: ${result2.quote.virtualChainRefundRecipient || 'NOT PROVIDED'}`);
    console.log('');

    // Test 3: Request with INTENTS recipientType
    console.log('========================================');
    console.log('Test 3: With recipientType: INTENTS');
    console.log('========================================');
    
    const quote3: QuoteRequest = {
      dry: true,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: usdcEth,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: ethEth,
      amount: '1000000000',
      recipient: ethAddress,
      recipientType: 'INTENTS', // ← Try INTENTS (docs show VIRTUAL_CHAIN)
      refundTo: ethAddress,
      refundType: 'ORIGIN_CHAIN',
      connectedWallets: [ethAddress],
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };

    console.log('Request with recipientType: INTENTS');
    console.log('');

    try {
      const result3 = await nearIntentsClient.requestQuote(quote3);
      
      console.log('✅ Quote Response:');
      console.log(`   virtualChainRecipient: ${result3.quote.virtualChainRecipient || 'NOT PROVIDED'}`);
      console.log(`   virtualChainRefundRecipient: ${result3.quote.virtualChainRefundRecipient || 'NOT PROVIDED'}`);
      console.log('');
    } catch (error: any) {
      console.log('❌ Error:', error.message);
      console.log('');
    }

    // Test 4: Request with VIRTUAL_CHAIN recipientType (from docs)
    console.log('========================================');
    console.log('Test 4: With recipientType: VIRTUAL_CHAIN');
    console.log('========================================');
    
    const quote4: QuoteRequest = {
      dry: true,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: usdcEth,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: ethEth,
      amount: '1000000000',
      recipient: ethAddress,
      recipientType: 'VIRTUAL_CHAIN', // ← From API docs!
      refundTo: ethAddress,
      refundType: 'ORIGIN_CHAIN',
      connectedWallets: [ethAddress],
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };

    console.log('Request with recipientType: VIRTUAL_CHAIN');
    console.log('');

    try {
      const result4 = await nearIntentsClient.requestQuote(quote4);
      
      console.log('✅ Quote Response:');
      console.log(`   virtualChainRecipient: ${result4.quote.virtualChainRecipient || 'NOT PROVIDED'}`);
      console.log(`   virtualChainRefundRecipient: ${result4.quote.virtualChainRefundRecipient || 'NOT PROVIDED'}`);
      console.log('');
      
      if (result4.quote.virtualChainRecipient) {
        console.log('🎉 SUCCESS! Found INTENTS account ID:');
        console.log(`   ${result4.quote.virtualChainRecipient}`);
        console.log('');
        console.log('This is the address to use for INTENTS swaps!');
      }
    } catch (error: any) {
      console.log('❌ Error:', error.message);
      console.log('');
    }

    console.log('========================================');
    console.log('Summary');
    console.log('========================================');
    console.log('');
    console.log('The virtualChainRecipient field in the quote response');
    console.log('contains the INTENTS account ID for virtual chain swaps.');
    console.log('');
    console.log('To use INTENTS for rebalancing:');
    console.log('1. Request quote with recipientType: VIRTUAL_CHAIN');
    console.log('2. Extract virtualChainRecipient from response');
    console.log('3. Use that address for subsequent INTENTS swaps');
    console.log('');

  } catch (error: any) {
    console.log('========================================');
    console.log('❌ Test Failed');
    console.log('========================================');
    console.log('');
    console.log('Error:', error.message);
    if (error.stack) {
      console.log('');
      console.log('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testIntentsVirtualAccount();

