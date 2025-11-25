// Test ANY_INPUT swap type for flexible deposit amounts
// This allows users to deposit any amount to a single address

import dotenv from 'dotenv';
import { nearIntentsClient } from '../integrations/nearIntents.js';
import { QuoteRequest } from '../integrations/nearIntentsTypes.js';

dotenv.config();

async function testAnyInputSwapType() {
  console.log('========================================');
  console.log('🧪 Testing ANY_INPUT Swap Type');
  console.log('========================================');
  console.log('');
  console.log('Goal: Get a deposit address that accepts any amount');
  console.log('');

  try {
    const ethAddress = '0x12da58E28A4E45B8ca9b96b01A8d5d8275Be369D';
    const ethAddressLowercase = ethAddress.toLowerCase();
    
    // Get supported tokens
    const tokens = await nearIntentsClient.getSupportedTokens();
    const ethEth = tokens.find(t => t.symbol === 'ETH' && t.blockchain === 'eth')!.assetId;
    const usdcEth = tokens.find(t => t.symbol === 'USDC' && t.blockchain === 'eth')!.assetId;

    // Test: ANY_INPUT for flexible deposit amount
    console.log('========================================');
    console.log('Test: ANY_INPUT - ETH → USDC (INTENTS)');
    console.log('========================================');
    
    const quote: QuoteRequest = {
      dry: false,
      swapType: 'ANY_INPUT', // ← Flexible amount!
      slippageTolerance: 100,
      originAsset: ethEth,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: usdcEth,
      amount: '0', // Not used for ANY_INPUT?
      recipient: ethAddressLowercase,
      recipientType: 'INTENTS',
      refundTo: ethAddress,
      refundType: 'ORIGIN_CHAIN',
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };

    console.log('Request:', {
      swapType: 'ANY_INPUT',
      from: 'ETH (any amount)',
      to: 'USDC (INTENTS)',
      intentsAccount: ethAddressLowercase,
    });
    console.log('');

    const result = await nearIntentsClient.requestQuote(quote);
    
    console.log('✅ SUCCESS! Quote received:');
    console.log('');
    console.log('🔑 Deposit Information:');
    console.log(`   Deposit Address: ${result.quote.depositAddress}`);
    console.log(`   Deadline: ${result.quote.deadline}`);
    console.log(`   Time Estimate: ${result.quote.timeEstimate}s`);
    console.log('');
    console.log('💡 User can deposit ANY amount of ETH to this address!');
    console.log('   It will automatically convert to USDC in INTENTS account.');
    console.log('');
    
    if (result.quote.amountIn) {
      console.log(`   Min Amount In: ${result.quote.minAmountIn || 'N/A'}`);
      console.log(`   Amount In: ${result.quote.amountInFormatted || 'N/A'}`);
    }
    
    console.log('');
    console.log('========================================');
    console.log('🎉 ANY_INPUT WORKS!');
    console.log('========================================');
    console.log('');
    console.log('This is perfect for the deposit address endpoint:');
    console.log('1. User requests deposit address for ETH');
    console.log('2. We generate ANY_INPUT quote: ETH → USDC (INTENTS)');
    console.log('3. Return deposit address');
    console.log('4. User can deposit any amount of ETH');
    console.log('5. Automatically converts to USDC in INTENTS');
    console.log('');

  } catch (error: any) {
    console.log('========================================');
    console.log('❌ Test Failed');
    console.log('========================================');
    console.log('');
    console.log('Error:', error.message);
    if (error.details) {
      console.log('Details:', JSON.stringify(error.details, null, 2));
    }
    
    console.log('');
    console.log('If ANY_INPUT doesn\'t work, alternatives:');
    console.log('1. Use EXACT_INPUT with a default amount (e.g., 1 ETH)');
    console.log('2. User specifies amount when requesting deposit address');
    console.log('3. Generate new quote when user deposits (track via webhook)');
    console.log('');
    
    process.exit(1);
  }
}

testAnyInputSwapType();

