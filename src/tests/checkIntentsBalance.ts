/**
 * Check INTENTS balance for Wallet 1
 */

import 'dotenv/config';
import { nearIntentsClient } from '../integrations/nearIntents.js';

// Wallet 1 credentials
const WALLET_ADDRESS = '0x7c180cACC0b95c160a80Fe1637b0011d651488d4';
const INTENTS_ACCOUNT = WALLET_ADDRESS.toLowerCase();

async function checkBalance() {
  console.log('========================================');
  console.log('🔍 Checking INTENTS Balance');
  console.log('========================================\n');

  console.log('Wallet Address:', WALLET_ADDRESS);
  console.log('INTENTS Account:', INTENTS_ACCOUNT);
  console.log('\n⏳ Fetching supported tokens...\n');

  try {
    // Get all supported tokens
    const tokens = await nearIntentsClient.getSupportedTokens();
    
    console.log(`✅ Found ${tokens.length} supported tokens\n`);
    
    // Find USDC token
    const usdcTokens = tokens.filter(t => 
      t.symbol === 'USDC' || 
      (t.name && t.name.toLowerCase().includes('usd coin'))
    );
    
    console.log('USDC Tokens found:');
    usdcTokens.forEach(token => {
      console.log(`  - ${token.symbol} (${token.name || 'N/A'})`);
      console.log(`    Asset ID: ${token.assetId}`);
      console.log(`    Decimals: ${token.decimals}`);
      console.log(`    Blockchains: ${token.blockchains ? token.blockchains.join(', ') : 'N/A'}`);
      console.log('');
    });

    // The USDC we've been using
    const USDC_ASSET_ID = 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';
    const usdcToken = tokens.find(t => t.assetId === USDC_ASSET_ID);
    
    if (usdcToken) {
      console.log('✅ Found our USDC token:');
      console.log(`  Symbol: ${usdcToken.symbol}`);
      console.log(`  Name: ${usdcToken.name}`);
      console.log(`  Asset ID: ${usdcToken.assetId}`);
      console.log(`  Decimals: ${usdcToken.decimals}`);
    } else {
      console.log('❌ Could not find USDC token with our asset ID');
    }

    console.log('\n========================================');
    console.log('📊 Balance Check');
    console.log('========================================\n');
    
    console.log('Note: The 1-Click API does not provide a direct balance query.');
    console.log('To check balance, we need to:');
    console.log('1. View on INTENTS Explorer: https://intents.near.org/account/' + INTENTS_ACCOUNT);
    console.log('2. Or try a small test swap to see if we have funds');
    console.log('');
    console.log('According to our records:');
    console.log('  - Last deposit: 10 USDC');
    console.log('  - Previous test swaps: Multiple 1 USDC swaps');
    console.log('  - Expected remaining: ~5-8 USDC (depending on how many tests ran)');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkBalance();

