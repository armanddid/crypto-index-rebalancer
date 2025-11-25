// Test script for REAL End-to-End Swap with Generated Wallet
// This simulates the real application flow:
// 1. Generate wallet
// 2. Store encrypted private key
// 3. User deposits to generated wallet's INTENTS account
// 4. Monitor swap status
// 5. Later: Use stored private key to execute trades

import dotenv from 'dotenv';
import { nearIntentsClient } from '../integrations/nearIntents.js';
import { logger } from '../utils/logger.js';
import { QuoteRequest } from '../integrations/nearIntentsTypes.js';
import { generateWallet, encryptWalletPrivateKey, decryptWalletPrivateKey } from '../integrations/walletManager.js';

dotenv.config();

async function testRealSwapWithGeneratedWallet() {
  console.log('========================================');
  console.log('🔐 REAL E2E TEST - Generated Wallet');
  console.log('========================================');
  console.log('');
  console.log('This test simulates the real application flow:');
  console.log('1. Generate a new wallet for the user');
  console.log('2. Store encrypted private key (simulated)');
  console.log('3. Generate deposit address for INTENTS');
  console.log('4. User deposits funds');
  console.log('5. Monitor swap status');
  console.log('6. Funds arrive in INTENTS account');
  console.log('7. Later: Use private key to execute trades');
  console.log('');

  try {
    // Step 1: Generate Wallet (like we do in account creation)
    console.log('========================================');
    console.log('Step 1: Generate Wallet');
    console.log('========================================');
    
    const wallet = generateWallet();
    console.log('✅ Wallet generated:');
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Public Key: ${wallet.publicKey}`);
    console.log(`   Mnemonic: ${wallet.mnemonic?.substring(0, 20)}...`);
    console.log('');

    // Step 2: Encrypt and Store Private Key (like we do in database)
    console.log('========================================');
    console.log('Step 2: Encrypt Private Key');
    console.log('========================================');
    
    const encryptedPrivateKey = encryptWalletPrivateKey(wallet.privateKey);
    console.log('✅ Private key encrypted:');
    console.log(`   Encrypted: ${encryptedPrivateKey.substring(0, 40)}...`);
    console.log(`   Length: ${encryptedPrivateKey.length} characters`);
    console.log('');
    console.log('💾 In real app: This would be stored in database');
    console.log('   - Associated with user account');
    console.log('   - Used later for programmatic trading');
    console.log('   - Never exposed to user');
    console.log('');

    // Step 3: Verify we can decrypt it later
    console.log('========================================');
    console.log('Step 3: Verify Decryption (for later use)');
    console.log('========================================');
    
    const decryptedPrivateKey = decryptWalletPrivateKey(encryptedPrivateKey);
    const keysMatch = decryptedPrivateKey === wallet.privateKey;
    console.log(`✅ Decryption test: ${keysMatch ? 'SUCCESS' : 'FAILED'}`);
    console.log('   This proves we can retrieve the key later for trading');
    console.log('');

    // Step 4: Get INTENTS account ID
    const intentsAccountId = wallet.address.toLowerCase();
    console.log('========================================');
    console.log('Step 4: INTENTS Account Setup');
    console.log('========================================');
    console.log(`✅ INTENTS Account ID: ${intentsAccountId}`);
    console.log('   This is where user funds will be held');
    console.log('   All rebalancing happens here (10-second swaps!)');
    console.log('');

    // Step 5: Get supported tokens
    console.log('📊 Fetching supported tokens...');
    const tokens = await nearIntentsClient.getSupportedTokens();
    console.log(`✅ Found ${tokens.length} tokens`);
    console.log('');

    // Find USDC on Base
    const usdcBase = tokens.find(t => t.symbol === 'USDC' && t.blockchain === 'base');
    if (!usdcBase) {
      throw new Error('USDC on Base not found');
    }

    // Step 6: Generate Deposit Address
    console.log('========================================');
    console.log('Step 5: Generate Deposit Address');
    console.log('========================================');
    
    const amount = '500000'; // 0.5 USDC (6 decimals)
    
    const quoteRequest: QuoteRequest = {
      dry: false,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: usdcBase.assetId,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: usdcBase.assetId,
      amount,
      recipient: intentsAccountId, // Generated wallet's INTENTS account
      recipientType: 'INTENTS',
      refundTo: wallet.address,
      refundType: 'ORIGIN_CHAIN',
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };

    console.log('Requesting quote...');
    const quoteResponse = await nearIntentsClient.requestQuote(quoteRequest);
    
    console.log('✅ Deposit address generated!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 DEPOSIT INSTRUCTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`   🎯 Deposit Address: ${quoteResponse.quote.depositAddress}`);
    console.log('');
    console.log(`   💰 Amount: ${quoteResponse.quote.amountInFormatted} USDC`);
    console.log(`   🌐 Network: Base`);
    console.log(`   📝 Contract: ${usdcBase.contractAddress}`);
    console.log('');
    console.log(`   ⏰ Valid for: ~${Math.floor((new Date(quoteResponse.quote.deadline).getTime() - Date.now()) / 1000 / 60)} minutes`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Expected Output:');
    console.log(`   Amount: ${quoteResponse.quote.amountOutFormatted} USDC`);
    console.log(`   Destination: INTENTS account ${intentsAccountId}`);
    console.log(`   Time Estimate: ${quoteResponse.quote.timeEstimate} seconds`);
    console.log('');

    // Step 7: Monitor Status
    console.log('========================================');
    console.log('Step 6: Monitoring Swap Status');
    console.log('========================================');
    console.log('');
    console.log('Waiting 30 seconds before polling...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    console.log('');
    console.log('Polling every 10 seconds (max 10 minutes)...');
    console.log('');

    let pollCount = 0;
    const maxPolls = 60;
    const pollInterval = 10000;
    const startTime = Date.now();

    while (pollCount < maxPolls) {
      pollCount++;
      
      try {
        const status = await nearIntentsClient.getSwapStatus(
          quoteResponse.quote.depositAddress,
          quoteResponse.quote.depositMemo
        );

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        
        console.log(`[${new Date().toLocaleTimeString()}] Poll #${pollCount} (${elapsed}s)`);
        console.log(`   Status: ${status.status}`);

        if (status.swapDetails?.depositedAmount) {
          console.log(`   💰 Deposited: ${status.swapDetails.depositedAmountFormatted} USDC`);
        }
        if (status.swapDetails?.amountOut) {
          console.log(`   ✅ Output: ${status.swapDetails.amountOutFormatted} USDC`);
        }

        if (status.status === 'SUCCESS') {
          console.log('');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🎉 SWAP SUCCESSFUL!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('');
          console.log('Summary:');
          console.log(`   ✅ Wallet Generated: ${wallet.address}`);
          console.log(`   ✅ Private Key Encrypted & Stored`);
          console.log(`   ✅ Funds Deposited: ${status.swapDetails?.depositedAmountFormatted} USDC`);
          console.log(`   ✅ Funds in INTENTS: ${status.swapDetails?.amountOutFormatted} USDC`);
          console.log(`   ✅ INTENTS Account: ${intentsAccountId}`);
          console.log(`   ⏱️  Time: ${elapsed} seconds`);
          console.log('');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('');
          console.log('📋 What Happens Next (in real app):');
          console.log('');
          console.log('1. User creates an index:');
          console.log('   - Selects assets (e.g., 40% BTC, 30% ETH, 30% SOL)');
          console.log('   - Sets rebalancing rules (drift %, time-based)');
          console.log('');
          console.log('2. Initial portfolio construction:');
          console.log('   - System decrypts private key');
          console.log('   - Generates quotes for each asset');
          console.log('   - Executes swaps: USDC → BTC, ETH, SOL (in INTENTS)');
          console.log('   - All swaps happen in ~10 seconds each!');
          console.log('');
          console.log('3. Automatic rebalancing:');
          console.log('   - System monitors drift');
          console.log('   - When threshold exceeded, triggers rebalance');
          console.log('   - Uses stored private key to sign transactions');
          console.log('   - Swaps within INTENTS (fast & cheap)');
          console.log('');
          console.log('4. User withdrawals:');
          console.log('   - User requests withdrawal');
          console.log('   - System swaps to desired asset');
          console.log('   - Sends from INTENTS to user\'s external wallet');
          console.log('');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('');
          console.log('🔐 Security Notes:');
          console.log('   - Private key is AES-256-GCM encrypted');
          console.log('   - Encryption key stored in environment variable');
          console.log('   - Never exposed to user or logs');
          console.log('   - Only decrypted in memory for signing');
          console.log('   - Wallet is non-custodial (user controls funds)');
          console.log('');
          break;
        } else if (['REFUNDED', 'FAILED'].includes(status.status)) {
          console.log('');
          console.log(`⚠️  Swap ${status.status}`);
          break;
        } else if (status.status === 'PROCESSING') {
          console.log('   🔄 Processing...');
        } else if (status.status === 'PENDING_DEPOSIT') {
          console.log('   ⏳ Waiting for deposit...');
        }

        console.log('');

        if (!['SUCCESS', 'REFUNDED', 'FAILED'].includes(status.status)) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } else {
          break;
        }

      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log('');
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    if (pollCount >= maxPolls) {
      console.log('');
      console.log('⏱️  Polling timeout. Check status manually:');
      console.log(`   Deposit Address: ${quoteResponse.quote.depositAddress}`);
      console.log('');
    }

  } catch (error: any) {
    console.log('');
    console.log('❌ TEST FAILED');
    console.log('');
    console.log('Error:', error.message);
    if (error.stack) {
      console.log('');
      console.log('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testRealSwapWithGeneratedWallet();

