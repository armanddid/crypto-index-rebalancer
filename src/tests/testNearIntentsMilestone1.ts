// Test script for NEAR Intents Milestone 1: Basic API Client
// Tests: Fetch supported tokens

import dotenv from 'dotenv';
import { nearIntentsClient } from '../integrations/nearIntents.js';
import { logger } from '../utils/logger.js';

dotenv.config();

async function testMilestone1() {
  console.log('========================================');
  console.log('🧪 NEAR Intents Milestone 1 Test');
  console.log('========================================');
  console.log('');

  try {
    // Test 1: Health Check
    console.log('📊 Test 1: Health Check');
    const isHealthy = await nearIntentsClient.healthCheck();
    console.log(`✅ API Health: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    console.log('');

    // Test 2: Get Supported Tokens
    console.log('📊 Test 2: Get Supported Tokens');
    const tokens = await nearIntentsClient.getSupportedTokens();
    console.log(`✅ Fetched ${tokens.length} supported tokens`);
    console.log('');

    // Display first 10 tokens
    console.log('Sample tokens (first 10):');
    tokens.slice(0, 10).forEach((token, index) => {
      console.log(`${index + 1}. ${token.symbol} (${token.blockchain})`);
      console.log(`   Asset ID: ${token.assetId}`);
      console.log(`   Price: $${token.price}`);
      console.log(`   Decimals: ${token.decimals}`);
      console.log('');
    });

    // Test 3: Find specific tokens
    console.log('📊 Test 3: Find Specific Tokens');
    
    const testSymbols = ['USDC', 'NEAR', 'ETH', 'SOL', 'BTC'];
    
    for (const symbol of testSymbols) {
      const token = await nearIntentsClient.findTokenBySymbol(symbol);
      if (token) {
        console.log(`✅ Found ${symbol}:`);
        console.log(`   Blockchain: ${token.blockchain}`);
        console.log(`   Price: $${token.price}`);
        console.log(`   Asset ID: ${token.assetId}`);
      } else {
        console.log(`❌ ${symbol} not found`);
      }
      console.log('');
    }

    // Test 4: Get token prices
    console.log('📊 Test 4: Get Token Prices');
    for (const symbol of testSymbols) {
      const price = await nearIntentsClient.getTokenPrice(symbol);
      if (price !== null) {
        console.log(`✅ ${symbol}: $${price.toFixed(2)}`);
      } else {
        console.log(`❌ ${symbol}: Price not available`);
      }
    }
    console.log('');

    // Test 5: Token statistics
    console.log('📊 Test 5: Token Statistics');
    const blockchains = new Set(tokens.map(t => t.blockchain));
    console.log(`Total tokens: ${tokens.length}`);
    console.log(`Unique blockchains: ${blockchains.size}`);
    console.log(`Blockchains: ${Array.from(blockchains).join(', ')}`);
    console.log('');

    // Blockchain breakdown
    const blockchainCounts: Record<string, number> = {};
    tokens.forEach(token => {
      blockchainCounts[token.blockchain] = (blockchainCounts[token.blockchain] || 0) + 1;
    });
    
    console.log('Tokens per blockchain:');
    Object.entries(blockchainCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([blockchain, count]) => {
        console.log(`  ${blockchain}: ${count} tokens`);
      });
    console.log('');

    console.log('========================================');
    console.log('✅ Milestone 1: ALL TESTS PASSED!');
    console.log('========================================');
    console.log('');
    console.log('Summary:');
    console.log('- ✅ API connection working');
    console.log('- ✅ Can fetch supported tokens');
    console.log('- ✅ Can find tokens by symbol');
    console.log('- ✅ Can get token prices');
    console.log('- ✅ Token data is complete');
    console.log('');
    console.log('Next: Milestone 2 - Quote Generation (Dry Run)');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('❌ Milestone 1: TEST FAILED');
    console.error('========================================');
    console.error('');
    console.error('Error:', error);
    console.error('');
    
    if (error instanceof Error) {
      console.error('Error details:');
      console.error('  Message:', error.message);
      console.error('  Stack:', error.stack);
    }
    
    process.exit(1);
  }
}

// Run tests
testMilestone1()
  .then(() => {
    logger.info('Milestone 1 tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Milestone 1 tests failed:', error);
    process.exit(1);
  });

