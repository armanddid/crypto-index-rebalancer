// Test different patterns for ANY_INPUT to support flexible deposits
// Trying various configurations to see if it works

import dotenv from 'dotenv';
import { nearIntentsClient } from '../integrations/nearIntents.js';
import { QuoteRequest } from '../integrations/nearIntentsTypes.js';

dotenv.config();

async function testAnyInputPatterns() {
  console.log('========================================');
  console.log('🧪 Testing ANY_INPUT Patterns');
  console.log('========================================');
  console.log('');

  try {
    const ethAddress = '0x12da58E28A4E45B8ca9b96b01A8d5d8275Be369D';
    const ethAddressLowercase = ethAddress.toLowerCase();
    
    // Get supported tokens
    const tokens = await nearIntentsClient.getSupportedTokens();
    const ethEth = tokens.find(t => t.symbol === 'ETH' && t.blockchain === 'eth')!.assetId;
    const usdcEth = tokens.find(t => t.symbol === 'USDC' && t.blockchain === 'eth')!.assetId;

    // Pattern 1: ANY_INPUT without amount field
    console.log('========================================');
    console.log('Pattern 1: ANY_INPUT without amount field');
    console.log('========================================');
    
    try {
      const quote1: any = {
        dry: false,
        swapType: 'ANY_INPUT',
        slippageTolerance: 100,
        originAsset: ethEth,
        depositType: 'ORIGIN_CHAIN',
        destinationAsset: usdcEth,
        // No amount field at all
        recipient: ethAddressLowercase,
        recipientType: 'INTENTS',
        refundTo: ethAddress,
        refundType: 'ORIGIN_CHAIN',
        deadline: new Date(Date.now() + 3600000).toISOString(),
      };

      console.log('Trying without amount field...');
      const result1 = await nearIntentsClient.requestQuote(quote1);
      console.log('✅ SUCCESS!');
      console.log(`   Deposit Address: ${result1.quote.depositAddress}`);
      console.log('');
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('');
    }

    // Pattern 2: ANY_INPUT with minAmountIn
    console.log('========================================');
    console.log('Pattern 2: ANY_INPUT with minAmountIn');
    console.log('========================================');
    
    try {
      const quote2: any = {
        dry: false,
        swapType: 'ANY_INPUT',
        slippageTolerance: 100,
        originAsset: ethEth,
        depositType: 'ORIGIN_CHAIN',
        destinationAsset: usdcEth,
        minAmountIn: '10000000000000000', // 0.01 ETH minimum
        recipient: ethAddressLowercase,
        recipientType: 'INTENTS',
        refundTo: ethAddress,
        refundType: 'ORIGIN_CHAIN',
        deadline: new Date(Date.now() + 3600000).toISOString(),
      };

      console.log('Trying with minAmountIn...');
      const result2 = await nearIntentsClient.requestQuote(quote2);
      console.log('✅ SUCCESS!');
      console.log(`   Deposit Address: ${result2.quote.depositAddress}`);
      console.log('');
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('');
    }

    // Pattern 3: ANY_INPUT with amount as string "0"
    console.log('========================================');
    console.log('Pattern 3: ANY_INPUT with amount = "0"');
    console.log('========================================');
    
    try {
      const quote3: QuoteRequest = {
        dry: false,
        swapType: 'ANY_INPUT',
        slippageTolerance: 100,
        originAsset: ethEth,
        depositType: 'ORIGIN_CHAIN',
        destinationAsset: usdcEth,
        amount: '0',
        recipient: ethAddressLowercase,
        recipientType: 'INTENTS',
        refundTo: ethAddress,
        refundType: 'ORIGIN_CHAIN',
        deadline: new Date(Date.now() + 3600000).toISOString(),
      };

      console.log('Trying with amount = "0"...');
      const result3 = await nearIntentsClient.requestQuote(quote3);
      console.log('✅ SUCCESS!');
      console.log(`   Deposit Address: ${result3.quote.depositAddress}`);
      console.log('');
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('');
    }

    // Pattern 4: ANY_INPUT in dry mode first
    console.log('========================================');
    console.log('Pattern 4: ANY_INPUT in dry mode');
    console.log('========================================');
    
    try {
      const quote4: QuoteRequest = {
        dry: true, // Try dry first
        swapType: 'ANY_INPUT',
        slippageTolerance: 100,
        originAsset: ethEth,
        depositType: 'ORIGIN_CHAIN',
        destinationAsset: usdcEth,
        amount: '1000000000000000000', // 1 ETH
        recipient: ethAddressLowercase,
        recipientType: 'INTENTS',
        refundTo: ethAddress,
        refundType: 'ORIGIN_CHAIN',
        deadline: new Date(Date.now() + 3600000).toISOString(),
      };

      console.log('Trying dry run with ANY_INPUT...');
      const result4 = await nearIntentsClient.requestQuote(quote4);
      console.log('✅ SUCCESS in dry mode!');
      console.log(`   Amount Out: ${result4.quote.amountOutFormatted} USDC`);
      console.log('');
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('');
    }

    // Pattern 5: Check if there's a special depositMode
    console.log('========================================');
    console.log('Pattern 5: ANY_INPUT with depositMode: MEMO');
    console.log('========================================');
    
    try {
      const quote5: QuoteRequest = {
        dry: false,
        depositMode: 'MEMO', // Try MEMO mode
        swapType: 'ANY_INPUT',
        slippageTolerance: 100,
        originAsset: ethEth,
        depositType: 'ORIGIN_CHAIN',
        destinationAsset: usdcEth,
        amount: '1000000000000000000',
        recipient: ethAddressLowercase,
        recipientType: 'INTENTS',
        refundTo: ethAddress,
        refundType: 'ORIGIN_CHAIN',
        deadline: new Date(Date.now() + 3600000).toISOString(),
      };

      console.log('Trying with depositMode: MEMO...');
      const result5 = await nearIntentsClient.requestQuote(quote5);
      console.log('✅ SUCCESS!');
      console.log(`   Deposit Address: ${result5.quote.depositAddress}`);
      console.log(`   Deposit Memo: ${result5.quote.depositMemo || 'N/A'}`);
      console.log('');
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('');
    }

    console.log('========================================');
    console.log('Summary');
    console.log('========================================');
    console.log('');
    console.log('If none of the patterns worked, we\'ll use EXACT_INPUT');
    console.log('with amount specified by the user.');
    console.log('');

  } catch (error: any) {
    console.log('========================================');
    console.log('❌ Test Failed');
    console.log('========================================');
    console.log('');
    console.log('Error:', error.message);
    process.exit(1);
  }
}

testAnyInputPatterns();

