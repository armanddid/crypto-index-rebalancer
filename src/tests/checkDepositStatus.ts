import axios from 'axios';

const depositAddress = '0xB4212fc95EcCd9396abEAF69d8ae653d68a9986f';
const walletAddress = '0x7325B08bf56196B8661fD27830Ba55B3577cf736';

async function checkDepositStatus() {
  console.log('========================================');
  console.log('🔍 Checking Deposit Status');
  console.log('========================================\n');

  console.log(`Wallet Address: ${walletAddress}`);
  console.log(`INTENTS Account: ${walletAddress.toLowerCase()}`);
  console.log(`Deposit Address: ${depositAddress}\n`);

  try {
    const response = await axios.get(
      `https://1click.chaindefuser.com/swap/status/${depositAddress}`
    );

    console.log('✅ Swap Status Found!\n');
    console.log(`Status: ${response.data.status}`);
    console.log(`Amount In: ${response.data.quote?.amountIn || 'N/A'}`);
    console.log(`Amount Out: ${response.data.quote?.amountOut || 'N/A'}`);
    console.log(`Time Estimate: ${response.data.quote?.timeEstimate || 'N/A'} seconds`);
    
    if (response.data.status === 'SUCCESS') {
      console.log('\n🎉 SUCCESS! Funds have been deposited to INTENTS');
      console.log(`\nYour INTENTS account (${walletAddress.toLowerCase()}) should now have ${response.data.quote?.amountOut || '10'} USDC`);
    } else if (response.data.status === 'PENDING_DEPOSIT') {
      console.log('\n⏳ Waiting for deposit...');
      console.log('The swap is created but funds haven\'t been received yet.');
    } else if (response.data.status === 'PROCESSING') {
      console.log('\n⚙️  Processing...');
      console.log('Funds received, swap in progress.');
    } else {
      console.log(`\n⚠️  Status: ${response.data.status}`);
    }

  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log('❌ Swap not found');
      console.log('This could mean:');
      console.log('  1. The deposit address has expired');
      console.log('  2. No swap was created for this address');
      console.log('  3. The swap completed and was removed from the system');
    } else {
      console.error('❌ Error checking status:', error.message);
    }
  }
}

checkDepositStatus();

