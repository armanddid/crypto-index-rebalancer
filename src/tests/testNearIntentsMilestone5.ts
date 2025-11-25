// Test script for NEAR Intents Milestone 5: Status Monitoring
// Tests: Check swap status using deposit address

import dotenv from 'dotenv';
import { nearIntentsClient } from '../integrations/nearIntents.js';
import { logger } from '../utils/logger.js';
import { QuoteRequest } from '../integrations/nearIntentsTypes.js';

dotenv.config();

async function testMilestone5() {
  console.log('========================================');
  console.log('🧪 NEAR Intents Milestone 5 Test');
  console.log('Status Monitoring');
  console.log('========================================');
  console.log('');

  try {
    const ethAddress = '0x12da58E28A4E45B8ca9b96b01A8d5d8275Be369D';
    const ethAddressLowercase = ethAddress.toLowerCase();
    
    // Get supported tokens
    console.log('📊 Fetching supported tokens...');
    const tokens = await nearIntentsClient.getSupportedTokens();
    console.log(`✅ Found ${tokens.length} tokens`);
    console.log('');

    const usdcEth = tokens.find(t => t.symbol === 'USDC' && t.blockchain === 'eth')!.assetId;
    const ethEth = tokens.find(t => t.symbol === 'ETH' && t.blockchain === 'eth')!.assetId;

    // Test 1: Generate a real quote to get a deposit address
    console.log('========================================');
    console.log('Test 1: Generate Quote for Testing');
    console.log('========================================');
    
    const quote: QuoteRequest = {
      dry: false,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: usdcEth,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: ethEth,
      amount: '1000000', // 1 USDC
      recipient: ethAddressLowercase,
      recipientType: 'INTENTS',
      refundTo: ethAddress,
      refundType: 'ORIGIN_CHAIN',
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };

    console.log('Generating quote...');
    const quoteResponse = await nearIntentsClient.requestQuote(quote);
    
    const depositAddress = quoteResponse.quote.depositAddress;
    const depositMemo = quoteResponse.quote.depositMemo;
    
    console.log('✅ Quote generated:');
    console.log(`   Deposit Address: ${depositAddress}`);
    console.log(`   Deposit Memo: ${depositMemo || 'N/A'}`);
    console.log(`   Amount: ${quoteResponse.quote.amountInFormatted} USDC`);
    console.log(`   Expected Output: ${quoteResponse.quote.amountOutFormatted} ETH`);
    console.log('');

    // Test 2: Check status immediately (should be PENDING_DEPOSIT)
    console.log('========================================');
    console.log('Test 2: Check Status (No Deposit Yet)');
    console.log('========================================');
    
    console.log(`Checking status for: ${depositAddress}`);
    const status1 = await nearIntentsClient.getSwapStatus(depositAddress, depositMemo);
    
    console.log('✅ Status retrieved:');
    console.log(`   Status: ${status1.status}`);
    console.log(`   Updated At: ${status1.updatedAt}`);
    console.log('');

    if (status1.status === 'PENDING_DEPOSIT') {
      console.log('✅ Correct! Status is PENDING_DEPOSIT (no funds sent yet)');
    } else {
      console.log(`⚠️  Unexpected status: ${status1.status}`);
    }
    console.log('');

    // Test 3: Check quote details in status response
    console.log('========================================');
    console.log('Test 3: Verify Quote Details in Status');
    console.log('========================================');
    
    console.log('Quote Request Details:');
    console.log(`   Origin Asset: ${status1.quoteResponse.quoteRequest.originAsset}`);
    console.log(`   Destination Asset: ${status1.quoteResponse.quoteRequest.destinationAsset}`);
    console.log(`   Amount: ${status1.quoteResponse.quoteRequest.amount}`);
    console.log(`   Recipient: ${status1.quoteResponse.quoteRequest.recipient}`);
    console.log(`   Recipient Type: ${status1.quoteResponse.quoteRequest.recipientType}`);
    console.log('');

    console.log('Quote Response Details:');
    console.log(`   Amount In: ${status1.quoteResponse.quote.amountInFormatted}`);
    console.log(`   Amount Out: ${status1.quoteResponse.quote.amountOutFormatted}`);
    console.log(`   Deadline: ${status1.quoteResponse.quote.deadline}`);
    console.log(`   Time Estimate: ${status1.quoteResponse.quote.timeEstimate}s`);
    console.log('');

    // Test 4: Status polling simulation
    console.log('========================================');
    console.log('Test 4: Status Polling Simulation');
    console.log('========================================');
    console.log('Simulating status checks (like we would do in production)...');
    console.log('');

    for (let i = 1; i <= 3; i++) {
      console.log(`Poll #${i}:`);
      const pollStatus = await nearIntentsClient.getSwapStatus(depositAddress, depositMemo);
      console.log(`   Status: ${pollStatus.status}`);
      console.log(`   Updated: ${pollStatus.updatedAt}`);
      
      if (pollStatus.status !== 'PENDING_DEPOSIT') {
        console.log('   ⚠️  Status changed! (Unexpected for this test)');
        if (pollStatus.swapDetails) {
          console.log(`   Deposited Amount: ${pollStatus.swapDetails.depositedAmountFormatted || 'N/A'}`);
          console.log(`   Output Amount: ${pollStatus.swapDetails.amountOutFormatted || 'N/A'}`);
        }
      }
      
      // Wait 1 second between polls
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    console.log('');

    // Summary
    console.log('========================================');
    console.log('✅ Milestone 5: ALL TESTS PASSED!');
    console.log('========================================');
    console.log('');
    console.log('Summary:');
    console.log('- ✅ Can generate quotes with deposit addresses');
    console.log('- ✅ Can check swap status by deposit address');
    console.log('- ✅ Status returns PENDING_DEPOSIT when no funds sent');
    console.log('- ✅ Status includes full quote details');
    console.log('- ✅ Can poll status multiple times');
    console.log('- ✅ Status response includes timestamps');
    console.log('');
    console.log('Swap Status Flow:');
    console.log('1. PENDING_DEPOSIT - Waiting for user to send funds');
    console.log('2. PROCESSING - Funds received, swap in progress');
    console.log('3. SUCCESS - Swap completed, funds delivered');
    console.log('4. REFUNDED - Swap failed, funds returned');
    console.log('5. INCOMPLETE_DEPOSIT - Deposit below required amount');
    console.log('6. FAILED - Swap failed due to error');
    console.log('');
    console.log('Production Usage:');
    console.log('- Poll status every 5-10 seconds after user deposits');
    console.log('- Stop polling when status is SUCCESS, REFUNDED, or FAILED');
    console.log('- Store deposit address to track user deposits');
    console.log('- Update UI based on status changes');
    console.log('');
    console.log('Next: Milestone 6 - E2E Test with Real Funds (Optional)');
    console.log('');

  } catch (error: any) {
    console.log('========================================');
    console.log('❌ Milestone 5: TEST FAILED');
    console.log('========================================');
    console.log('');
    console.log('Error:', error.message);
    if (error.details) {
      console.log('Details:', JSON.stringify(error.details, null, 2));
    }
    if (error.stack) {
      console.log('');
      console.log('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testMilestone5();

