/**
 * Check the status of a specific quote/deposit address
 * 
 * This helps us understand if the automatic execution approach works
 */

import 'dotenv/config';
import { nearIntentsClient } from '../integrations/nearIntents.js';

// Deposit address from the interrupted test
const DEPOSIT_ADDRESS = '3c4878ae318c7268f5b10e91271ff641a2dd9e3dec397c6d966bb4f022ed6981';

async function checkStatus() {
  console.log('========================================');
  console.log('🔍 Checking Quote Status');
  console.log('========================================\n');

  console.log('Deposit Address:', DEPOSIT_ADDRESS);
  console.log('');

  try {
    const status = await nearIntentsClient.getSwapStatus(DEPOSIT_ADDRESS);

    console.log('✅ Status Retrieved:');
    console.log(JSON.stringify(status, null, 2));

  } catch (error: any) {
    console.error('\n❌ Failed to get status:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkStatus();

