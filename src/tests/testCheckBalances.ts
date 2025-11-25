/**
 * Test checking INTENTS balances
 */

import 'dotenv/config';
import { getIntentsBalances, findUSDCBalances } from '../integrations/intentsBalanceChecker.js';

// Wallet 1 credentials
const WALLET_ADDRESS = '0x7c180cACC0b95c160a80Fe1637b0011d651488d4';
const EVM_PRIVATE_KEY = '0x7614647b69c233c650320a817de067bbb367a60b1d0503180ac1cf2cf8f53e7d';

async function testCheckBalances() {
  console.log('========================================');
  console.log('🔍 Checking INTENTS Balances');
  console.log('========================================\n');

  console.log('Wallet:', WALLET_ADDRESS);
  console.log('INTENTS Account:', WALLET_ADDRESS.toLowerCase());
  console.log('');

  try {
    console.log('⏳ Fetching all token balances...\n');

    const balances = await getIntentsBalances(EVM_PRIVATE_KEY, WALLET_ADDRESS);

    console.log('✅ Balances retrieved successfully!\n');
    console.log('Account:', balances.accountId);
    console.log('Timestamp:', balances.timestamp.toISOString());
    console.log('Token Count:', balances.tokens.length);
    console.log('');

    if (balances.tokens.length === 0) {
      console.log('⚠️  No tokens found in INTENTS');
      console.log('   This could mean:');
      console.log('   1. The account has no balance');
      console.log('   2. The query method name is incorrect');
      console.log('   3. The account ID format is wrong');
    } else {
      console.log('📊 Token Balances:');
      console.log('─'.repeat(80));
      balances.tokens.forEach((token, index) => {
        console.log(`\n${index + 1}. ${token.symbol}`);
        console.log(`   Asset ID: ${token.assetId}`);
        console.log(`   Balance: ${token.balanceFormatted} (${token.balance} smallest units)`);
        console.log(`   Decimals: ${token.decimals}`);
      });
      console.log('\n' + '─'.repeat(80));
    }

    console.log('\n⏳ Finding USDC tokens specifically...\n');

    const usdcBalances = await findUSDCBalances(EVM_PRIVATE_KEY, WALLET_ADDRESS);

    if (usdcBalances.length === 0) {
      console.log('⚠️  No USDC tokens found');
    } else {
      console.log(`✅ Found ${usdcBalances.length} USDC token(s):\n`);
      usdcBalances.forEach((token, index) => {
        console.log(`${index + 1}. ${token.symbol}: ${token.balanceFormatted}`);
        console.log(`   Asset ID: ${token.assetId}`);
      });
    }

    console.log('\n🔗 View on INTENTS Explorer:');
    console.log(`   https://intents.near.org/account/${WALLET_ADDRESS.toLowerCase()}`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('get_account_balances')) {
      console.error('\n💡 The method "get_account_balances" might not exist.');
      console.error('   We need to find the correct method name from the INTENTS contract.');
      console.error('   Alternative approaches:');
      console.error('   1. Check INTENTS contract documentation');
      console.error('   2. Use NEAR Explorer to see available methods');
      console.error('   3. Ask NEAR Intents team for the correct method');
    }
    
    if (error.stack) {
      console.error('\nStack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

testCheckBalances();

