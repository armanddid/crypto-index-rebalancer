// Test INTENTS mode with derived NEAR account IDs
// Testing both: EVM address (lowercase) and derived implicit account

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { nearIntentsClient } from '../integrations/nearIntents.js';
import { QuoteRequest } from '../integrations/nearIntentsTypes.js';
import { getNearAccountIdFromWallet, evmAddressAsNearAccount } from '../integrations/nearAccountDerivation.js';

dotenv.config();

async function testIntentsWithNearAccountId() {
  console.log('========================================');
  console.log('🧪 INTENTS Mode with NEAR Account IDs');
  console.log('========================================');
  console.log('');

  try {
    // Create a test wallet
    const wallet = ethers.Wallet.createRandom();
    const evmAddress = wallet.address;
    const nearImplicitAccount = getNearAccountIdFromWallet(wallet);
    const evmAsNearAccount = evmAddressAsNearAccount(evmAddress);

    console.log('Test Wallet:');
    console.log(`  EVM Address: ${evmAddress}`);
    console.log(`  NEAR Implicit Account: ${nearImplicitAccount}`);
    console.log(`  EVM as NEAR Account: ${evmAsNearAccount}`);
    console.log('');

    // Get supported tokens
    const tokens = await nearIntentsClient.getSupportedTokens();
    const usdcEth = tokens.find(t => t.symbol === 'USDC' && t.blockchain === 'eth')!.assetId;
    const ethEth = tokens.find(t => t.symbol === 'ETH' && t.blockchain === 'eth')!.assetId;

    // Test 1: Using lowercase EVM address
    console.log('========================================');
    console.log('Test 1: recipientType: INTENTS with EVM address (lowercase)');
    console.log('========================================');
    
    const quote1: QuoteRequest = {
      dry: true,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: usdcEth,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: ethEth,
      amount: '1000000', // 1 USDC
      recipient: evmAsNearAccount, // ← Lowercase EVM address
      recipientType: 'INTENTS',
      refundTo: evmAsNearAccount,
      refundType: 'ORIGIN_CHAIN',
      connectedWallets: [evmAddress],
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };

    console.log(`Trying recipient: ${evmAsNearAccount}`);
    console.log('');

    try {
      const result1 = await nearIntentsClient.requestQuote(quote1);
      console.log('✅ SUCCESS! Quote received:');
      console.log(`   Amount Out: ${result1.quote.amountOutFormatted} ETH`);
      if (result1.quote.virtualChainRecipient) {
        console.log(`   🔑 virtualChainRecipient: ${result1.quote.virtualChainRecipient}`);
      }
      console.log('');
      console.log('🎉 SOLUTION FOUND: Use lowercase EVM address for INTENTS!');
      console.log('');
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('');
    }

    // Test 2: Using NEAR implicit account ID
    console.log('========================================');
    console.log('Test 2: recipientType: INTENTS with NEAR implicit account');
    console.log('========================================');
    
    const quote2: QuoteRequest = {
      dry: true,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: usdcEth,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: ethEth,
      amount: '1000000', // 1 USDC
      recipient: nearImplicitAccount, // ← Derived implicit account
      recipientType: 'INTENTS',
      refundTo: evmAddress,
      refundType: 'ORIGIN_CHAIN',
      connectedWallets: [evmAddress],
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };

    console.log(`Trying recipient: ${nearImplicitAccount}`);
    console.log('');

    try {
      const result2 = await nearIntentsClient.requestQuote(quote2);
      console.log('✅ SUCCESS! Quote received:');
      console.log(`   Amount Out: ${result2.quote.amountOutFormatted} ETH`);
      if (result2.quote.virtualChainRecipient) {
        console.log(`   🔑 virtualChainRecipient: ${result2.quote.virtualChainRecipient}`);
      }
      console.log('');
      console.log('🎉 SOLUTION FOUND: Use NEAR implicit account for INTENTS!');
      console.log('');
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('');
    }

    // Test 3: INTENTS → INTENTS swap (if either above worked)
    console.log('========================================');
    console.log('Test 3: INTENTS → INTENTS swap');
    console.log('========================================');
    console.log('(Testing the rebalancing scenario)');
    console.log('');
    
    const quote3: QuoteRequest = {
      dry: true,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: usdcEth,
      depositType: 'INTENTS', // ← From INTENTS balance
      destinationAsset: ethEth,
      amount: '1000000', // 1 USDC
      recipient: evmAsNearAccount, // Try lowercase EVM first
      recipientType: 'INTENTS', // ← To INTENTS balance
      refundTo: evmAsNearAccount,
      refundType: 'INTENTS',
      connectedWallets: [evmAddress],
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };

    console.log(`Trying INTENTS → INTENTS with: ${evmAsNearAccount}`);
    console.log('');

    try {
      const result3 = await nearIntentsClient.requestQuote(quote3);
      console.log('✅ SUCCESS! INTENTS → INTENTS works!');
      console.log(`   Amount Out: ${result3.quote.amountOutFormatted} ETH`);
      console.log('');
      console.log('🎉 REBALANCING SOLUTION CONFIRMED!');
      console.log('');
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('');
    }

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

testIntentsWithNearAccountId();

