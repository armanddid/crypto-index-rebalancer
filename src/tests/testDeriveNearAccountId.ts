// Test script to derive NEAR account ID from EVM wallet
// Using @defuse-protocol/intents-sdk

import { ethers } from 'ethers';

async function testDeriveNearAccountId() {
  console.log('========================================');
  console.log('🔍 Derive NEAR Account ID from EVM Wallet');
  console.log('========================================');
  console.log('');

  try {
    // Test with our existing EVM address
    const ethAddress = '0x12da58E28A4E45B8ca9b96b01A8d5d8275Be369D';
    
    // Create a wallet instance to get the public key
    // Note: We need the private key to get the public key
    // For testing, let's create a random wallet
    const wallet = ethers.Wallet.createRandom();
    
    console.log('Test Wallet:');
    console.log(`  Address: ${wallet.address}`);
    console.log(`  Public Key: ${wallet.publicKey}`);
    console.log('');

    // Try to import the SDK function
    try {
      // @ts-ignore - Dynamic import to check if function exists
      const sdk = await import('@defuse-protocol/intents-sdk');
      
      console.log('SDK imported successfully!');
      console.log('Available exports:', Object.keys(sdk));
      console.log('');

      // Check if getImplicitAccountIdFromPublicKey exists
      if ('getImplicitAccountIdFromPublicKey' in sdk) {
        console.log('✅ Found getImplicitAccountIdFromPublicKey function!');
        console.log('');

        // @ts-ignore
        const nearAccountId = sdk.getImplicitAccountIdFromPublicKey(wallet.publicKey);
        
        console.log('========================================');
        console.log('🎉 SUCCESS!');
        console.log('========================================');
        console.log('');
        console.log(`EVM Address: ${wallet.address}`);
        console.log(`NEAR Account ID: ${nearAccountId}`);
        console.log('');
        console.log('This is the account ID to use for:');
        console.log('- recipient when recipientType: INTENTS');
        console.log('- refundTo when refundType: INTENTS');
        console.log('');
      } else {
        console.log('❌ getImplicitAccountIdFromPublicKey not found in SDK');
        console.log('');
        console.log('Available functions that might help:');
        const relevantFunctions = Object.keys(sdk).filter(key => 
          key.toLowerCase().includes('account') || 
          key.toLowerCase().includes('implicit') ||
          key.toLowerCase().includes('signer')
        );
        console.log(relevantFunctions);
        console.log('');
      }
    } catch (importError: any) {
      console.log('❌ Failed to import SDK:', importError.message);
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

testDeriveNearAccountId();

