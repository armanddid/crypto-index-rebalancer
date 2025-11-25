import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000/api';

async function createAccountForTesting() {
  console.log('========================================');
  console.log('🔧 Creating Test Account');
  console.log('========================================\n');

  try {
    // Create user and account
    const email = `test-persistent-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      name: 'Persistent Test User',
    });
    const authToken = registerResponse.data.token;
    const userId = registerResponse.data.userId;

    console.log('✅ User created');
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${userId}\n`);

    const accountResponse = await axios.post(
      `${BASE_URL}/accounts`,
      { name: 'Persistent Test Account' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const accountId = accountResponse.data.accountId;
    const walletAddress = accountResponse.data.walletAddress;

    console.log('✅ Account created');
    console.log(`   Account ID: ${accountId}`);
    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   INTENTS Account: ${walletAddress.toLowerCase()}\n`);

    // Save credentials to file
    const credentials = {
      email,
      password,
      userId,
      accountId,
      walletAddress,
      intentsAccount: walletAddress.toLowerCase(),
      authToken,
      createdAt: new Date().toISOString(),
    };

    const credentialsPath = path.join(process.cwd(), 'test-account-credentials.json');
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));

    console.log('✅ Credentials saved to: test-account-credentials.json\n');

    // Generate deposit address
    console.log('Step 2: Generate Deposit Address');
    console.log('----------------------------------------');

    const depositResponse = await axios.post(
      `${BASE_URL}/deposits/${accountId}/address`,
      {
        asset: 'USDC',
        blockchain: 'base',
        amount: '10000000', // 10 USDC
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('✅ Deposit address generated!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 DEPOSIT INSTRUCTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`   🎯 Deposit Address: ${depositResponse.data.depositAddress}`);
    console.log('');
    console.log(`   💰 Amount: ${depositResponse.data.amount} USDC`);
    console.log(`   🌐 Network: Base`);
    console.log(`   📝 Contract: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`);
    console.log('');
    console.log(`   ⏰ Valid until: ${depositResponse.data.deadline}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Send 10 USDC to the deposit address above');
    console.log('   2. Wait for confirmation (~35 seconds)');
    console.log('   3. Run: npm run test:use-saved-account');
    console.log('');

    // Save deposit info
    credentials.depositAddress = depositResponse.data.depositAddress;
    credentials.depositDeadline = depositResponse.data.deadline;
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

createAccountForTesting();

