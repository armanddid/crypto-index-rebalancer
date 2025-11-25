// Test script for REAL End-to-End Swap (Non-Interactive)
// WARNING: This uses REAL funds!
// Test: 0.5 USDC on Base → USDC in INTENTS

import dotenv from 'dotenv';
import { nearIntentsClient } from '../integrations/nearIntents.js';
import { logger } from '../utils/logger.js';
import { QuoteRequest } from '../integrations/nearIntentsTypes.js';

dotenv.config();

async function testRealSwapE2E() {
  console.log('========================================');
  console.log('🚨 REAL END-TO-END SWAP TEST');
  console.log('========================================');
  console.log('');
  console.log('⚠️  WARNING: This test uses REAL funds!');
  console.log('   Amount: 0.5 USDC on Base');
  console.log('   Destination: USDC in INTENTS');
  console.log('');

  try {
    // User's wallet address
    const userAddress = '0xd5530addf973ed108cbb0201bcf94e13b358457f';
    const userAddressLowercase = userAddress.toLowerCase();
    
    console.log(`Using wallet: ${userAddress}`);
    console.log('');

    // Get supported tokens
    console.log('📊 Fetching supported tokens...');
    const tokens = await nearIntentsClient.getSupportedTokens();
    console.log(`✅ Found ${tokens.length} tokens`);
    console.log('');

    // Find USDC on Base
    const usdcBase = tokens.find(t => t.symbol === 'USDC' && t.blockchain === 'base');
    if (!usdcBase) {
      throw new Error('USDC on Base not found in supported tokens');
    }

    console.log('Found USDC on Base:');
    console.log(`   Asset ID: ${usdcBase.assetId}`);
    console.log(`   Decimals: ${usdcBase.decimals}`);
    console.log(`   Price: $${usdcBase.price}`);
    console.log(`   Contract: ${usdcBase.contractAddress}`);
    console.log('');

    // Step 1: Generate Quote
    console.log('========================================');
    console.log('Step 1: Generating Quote');
    console.log('========================================');
    
    const amount = '500000'; // 0.5 USDC (6 decimals)
    
    const quoteRequest: QuoteRequest = {
      dry: false, // REAL QUOTE!
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100, // 1%
      originAsset: usdcBase.assetId,
      depositType: 'ORIGIN_CHAIN', // From Base chain
      destinationAsset: usdcBase.assetId, // Same asset (USDC → USDC)
      amount,
      recipient: userAddressLowercase, // INTENTS account
      recipientType: 'INTENTS', // To INTENTS!
      refundTo: userAddress,
      refundType: 'ORIGIN_CHAIN',
      deadline: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    };

    console.log('Requesting quote...');
    console.log(`   From: 0.5 USDC (Base)`);
    console.log(`   To: USDC (INTENTS)`);
    console.log(`   INTENTS Account: ${userAddressLowercase}`);
    console.log('');

    const quoteResponse = await nearIntentsClient.requestQuote(quoteRequest);
    
    console.log('✅ Quote Generated!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 DEPOSIT INSTRUCTIONS - SEND FUNDS NOW!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`   🎯 Deposit Address: ${quoteResponse.quote.depositAddress}`);
    console.log('');
    console.log(`   💰 Amount: ${quoteResponse.quote.amountInFormatted} USDC`);
    console.log(`   🌐 Network: Base`);
    console.log(`   📝 Contract: ${usdcBase.contractAddress}`);
    console.log('');
    console.log(`   ⏰ Deadline: ${new Date(quoteResponse.quote.deadline).toLocaleString()}`);
    console.log(`   ⏱️  Valid for: ~${Math.floor((new Date(quoteResponse.quote.deadline).getTime() - Date.now()) / 1000 / 60)} minutes`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Expected Output:');
    console.log(`   Amount: ${quoteResponse.quote.amountOutFormatted} USDC`);
    console.log(`   USD Value: $${quoteResponse.quote.amountOutUsd}`);
    console.log(`   Time Estimate: ${quoteResponse.quote.timeEstimate} seconds`);
    console.log('');
    console.log('How to send:');
    console.log('1. Open your wallet (MetaMask, Coinbase Wallet, etc.)');
    console.log('2. Switch to Base network');
    console.log('3. Send EXACTLY 0.5 USDC to the deposit address above');
    console.log('4. Wait for transaction confirmation');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Step 2: Wait a bit before starting to poll
    console.log('Waiting 30 seconds before starting status monitoring...');
    console.log('(This gives you time to send the transaction)');
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Step 3: Monitor Status
    console.log('========================================');
    console.log('Step 2: Monitoring Swap Status');
    console.log('========================================');
    console.log('');
    console.log('Polling status every 10 seconds...');
    console.log('(Will check for up to 10 minutes)');
    console.log('');

    let pollCount = 0;
    const maxPolls = 60; // 10 minutes max
    const pollInterval = 10000; // 10 seconds

    const startTime = Date.now();

    while (pollCount < maxPolls) {
      pollCount++;
      
      try {
        const status = await nearIntentsClient.getSwapStatus(
          quoteResponse.quote.depositAddress,
          quoteResponse.quote.depositMemo
        );

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        
        console.log(`[${new Date().toLocaleTimeString()}] Poll #${pollCount} (${elapsed}s elapsed)`);
        console.log(`   Status: ${status.status}`);
        console.log(`   Updated: ${new Date(status.updatedAt).toLocaleTimeString()}`);

        if (status.swapDetails) {
          if (status.swapDetails.depositedAmount) {
            console.log(`   💰 Deposited: ${status.swapDetails.depositedAmountFormatted} USDC`);
          }
          if (status.swapDetails.amountOut) {
            console.log(`   ✅ Output: ${status.swapDetails.amountOutFormatted} USDC`);
          }
          if (status.swapDetails.destinationChainTxHashes && status.swapDetails.destinationChainTxHashes.length > 0) {
            console.log(`   🔗 Tx Hash: ${status.swapDetails.destinationChainTxHashes[0].hash}`);
            console.log(`   🔍 Explorer: ${status.swapDetails.destinationChainTxHashes[0].explorerUrl}`);
          }
        }

        // Check if swap is complete
        if (status.status === 'SUCCESS') {
          console.log('');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🎉 SWAP SUCCESSFUL!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('');
          console.log('Final Details:');
          console.log(`   Deposited: ${status.swapDetails?.depositedAmountFormatted} USDC`);
          console.log(`   Received: ${status.swapDetails?.amountOutFormatted} USDC`);
          console.log(`   USD Value: $${status.swapDetails?.amountOutUsd}`);
          console.log(`   Time Taken: ${elapsed} seconds`);
          console.log('');
          console.log('✅ Funds are now in your INTENTS account!');
          console.log(`   INTENTS Account: ${userAddressLowercase}`);
          console.log('');
          console.log('You can now:');
          console.log('- Create an index with these funds');
          console.log('- Rebalance between assets (10-second swaps!)');
          console.log('- Withdraw to any supported chain');
          console.log('');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('');
          break;
        } else if (status.status === 'REFUNDED') {
          console.log('');
          console.log('========================================');
          console.log('⚠️  SWAP REFUNDED');
          console.log('========================================');
          console.log('');
          console.log('The swap was refunded. Possible reasons:');
          console.log('- Incorrect deposit amount');
          console.log('- Deadline expired');
          console.log('- Swap execution failed');
          console.log('');
          if (status.swapDetails?.refundedAmount) {
            console.log(`Refunded Amount: ${status.swapDetails.refundedAmountFormatted} USDC`);
          }
          console.log('');
          break;
        } else if (status.status === 'FAILED') {
          console.log('');
          console.log('========================================');
          console.log('❌ SWAP FAILED');
          console.log('========================================');
          console.log('');
          console.log('The swap failed. Check the transaction details.');
          console.log('');
          break;
        } else if (status.status === 'PROCESSING') {
          console.log('   🔄 Swap in progress...');
        } else if (status.status === 'PENDING_DEPOSIT') {
          console.log('   ⏳ Waiting for deposit...');
        }

        console.log('');

        // Wait before next poll
        if (pollCount < maxPolls && !['SUCCESS', 'REFUNDED', 'FAILED'].includes(status.status)) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } else if (['SUCCESS', 'REFUNDED', 'FAILED'].includes(status.status)) {
          break;
        }

      } catch (error: any) {
        console.log(`   ❌ Error checking status: ${error.message}`);
        console.log('');
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    if (pollCount >= maxPolls) {
      console.log('');
      console.log('⏱️  Polling timeout reached (10 minutes)');
      console.log('');
      console.log('The swap may still be processing. Check status manually:');
      console.log(`   Deposit Address: ${quoteResponse.quote.depositAddress}`);
      console.log('');
      console.log('Or run this command to check status:');
      console.log(`   curl "https://1click.chaindefuser.com/v0/status?depositAddress=${quoteResponse.quote.depositAddress}"`);
      console.log('');
    }

  } catch (error: any) {
    console.log('');
    console.log('========================================');
    console.log('❌ TEST FAILED');
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

testRealSwapE2E();

