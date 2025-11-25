import Database from 'better-sqlite3';
import path from 'path';
import { decryptPrivateKey } from '../utils/crypto.js';

const dbPath = path.join(process.cwd(), 'data', 'index-rebalancer.db');

async function retrieveLostWallets() {
  console.log('========================================');
  console.log('🔍 Retrieving Lost Wallets');
  console.log('========================================\n');

  try {
    const db = new Database(dbPath);

    // Get all accounts
    const accounts = db.prepare(`
      SELECT account_id, user_id, name, wallet_address, encrypted_private_key, created_at
      FROM accounts
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    if (accounts.length === 0) {
      console.log('❌ No accounts found in database');
      return;
    }

    console.log(`✅ Found ${accounts.length} accounts:\n`);

    for (const account of accounts as any[]) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Account ID: ${account.account_id}`);
      console.log(`Wallet Address: ${account.wallet_address}`);
      console.log(`INTENTS Account: ${account.wallet_address.toLowerCase()}`);
      console.log(`Created: ${account.created_at}`);
      
      try {
        const privateKey = decryptPrivateKey(account.encrypted_private_key);
        console.log(`Private Key: ${privateKey}`);
        console.log(`✅ Private key successfully decrypted!`);
      } catch (error) {
        console.log(`❌ Failed to decrypt private key: ${error}`);
      }
      
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 The wallets you were looking for:');
    console.log('   - 0x7c180cACC0b95c160a80Fe1637b0011d651488d4');
    console.log('   - 0x7325B08bf56196B8661fD27830Ba55B3577cf736');
    console.log('\nCheck if they are in the list above!');

    db.close();

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure the database exists at:', dbPath);
  }
}

retrieveLostWallets();

