/**
 * Check the status of a specific swap by deposit address
 */

import { nearIntentsClient } from '../integrations/nearIntents.js';

const depositAddress = '2b1197de037b0a5ca1b635ad0881547d1990b9690ae418670e172d5845d122fc'; // From the last test

async function checkStatus() {
  console.log('========================================');
  console.log('🔍 Checking Swap Status');
  console.log('========================================\n');
  console.log(`Deposit Address: ${depositAddress}\n`);

  try {
    const status = await nearIntentsClient.getSwapStatus(depositAddress);
    
    console.log('✅ Status retrieved:');
    console.log(JSON.stringify(status, null, 2));
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkStatus();

