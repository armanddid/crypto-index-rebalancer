// Test script for REAL End-to-End Swap
// WARNING: This uses REAL funds!
// Test: 0.5 USDC on Base → USDC in INTENTS

import dotenv from 'dotenv';
import { nearIntentsClient } from '../integrations/nearIntents.js';
import { logger } from '../utils/logger.js';
import { QuoteRequest } from '../integrations/nearIntentsTypes.js';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

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
    // Get user's wallet address
    const userAddress = await question('Enter your wallet address (0x...): ');
    const userAddressLowercase = userAddress.trim().toLowerCase();
    
    if (!userAddressLowercase.startsWith('0x') || userAddressLowercase.length !== 42) {
      throw new Error('Invalid Ethereum address format');
    }

    console.log('');
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
    console.log('📋 DEPOSIT INSTRUCTIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Deposit Address: ${quoteResponse.quote.depositAddress}`);
    console.log(`   Amount: ${quoteResponse.quote.amountInFormatted} USDC`);
    console.log(`   Network: Base`);
    console.log(`   Contract: ${usdcBase.contractAddress}`);
    console.log(`   Deadline: ${quoteResponse.quote.deadline}`);
    console.log(`   Valid for: ~${Math.floor((new Date(quoteResponse.quote.deadline).getTime() - Date.now()) / 1000 / 60)} minutes`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Expected Output:');
    console.log(`   Amount: ${quoteResponse.quote.amountOutFormatted} USDC`);
    console.log(`   USD Value: $${quoteResponse.quote.amountOutUsd}`);
    console.log(`   Time Estimate: ${quoteResponse.quote.timeEstimate} seconds`);
    console.log('');

    // Step 2: Wait for user to send funds
    console.log('========================================');
    console.log('Step 2: Send Funds');
    console.log('========================================');
    console.log('');
    console.log('Please send EXACTLY 0.5 USDC to the deposit address above.');
    console.log('');
    console.log('How to send:');
    console.log('1. Open your wallet (MetaMask, Coinbase Wallet, etc.)');
    console.log('2. Switch to Base network');
    console.log('3. Send 0.5 USDC to the deposit address');
    console.log('4. Wait for transaction confirmation');
    console.log('');

    const ready = await question('Have you sent the funds? (yes/no): ');
    if (ready.toLowerCase() !== 'yes') {
      console.log('');
      console.log('Test cancelled. You can run this test again when ready.');
      console.log('');
      console.log('To check status later, use:');
      console.log(`   Deposit Address: ${quoteResponse.quote.depositAddress}`);
      rl.close();
      return;
    }

    console.log('');
    const txHash = await question('Enter your transaction hash (optional, press Enter to skip): ');
    console.log('');

    // Step 3: Monitor Status
    console.log('========================================');
    console.log('Step 3: Monitoring Swap Status');
    console.log('========================================');
    console.log('');
    console.log('Polling status every 10 seconds...');
    console.log('(Press Ctrl+C to stop)');
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
        console.log(`   Updated: ${status.updatedAt}`);

        if (status.swapDetails) {
          if (status.swapDetails.depositedAmount) {
            console.log(`   Deposited: ${status.swapDetails.depositedAmountFormatted} USDC`);
          }
          if (status.swapDetails.amountOut) {
            console.log(`   Output: ${status.swapDetails.amountOutFormatted} USDC`);
          }
          if (status.swapDetails.destinationChainTxHashes && status.swapDetails.destinationChainTxHashes.length > 0) {
            console.log(`   Tx Hash: ${status.swapDetails.destinationChainTxHashes[0].hash}`);
            console.log(`   Explorer: ${status.swapDetails.destinationChainTxHashes[0].explorerUrl}`);
          }
        }

        // Check if swap is complete
        if (status.status === 'SUCCESS') {
          console.log('');
          console.log('========================================');
          console.log('🎉 SWAP SUCCESSFUL!');
          console.log('========================================');
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
        }

        console.log('');

        // Wait before next poll
        if (pollCount < maxPolls && !['SUCCESS', 'REFUNDED', 'FAILED'].includes(status.status)) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
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
    }

    rl.close();

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
    rl.close();
    process.exit(1);
  }
}

console.log('');
console.log('🚨 REAL FUNDS TEST - READ CAREFULLY 🚨');
console.log('');
console.log('This test will:');
console.log('1. Generate a real deposit address');
console.log('2. Wait for you to send 0.5 USDC on Base');
console.log('3. Monitor the swap status in real-time');
console.log('4. Confirm when funds arrive in INTENTS');
console.log('');
console.log('Make sure you have:');
console.log('- 0.5 USDC on Base network');
console.log('- Gas for the transaction (small amount of ETH on Base)');
console.log('- Your wallet ready (MetaMask, Coinbase Wallet, etc.)');
console.log('');

testRealSwapE2E();

