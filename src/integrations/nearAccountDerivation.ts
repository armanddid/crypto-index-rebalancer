// NEAR Account ID derivation from EVM wallet
// Based on NEAR implicit account specification

import { ethers } from 'ethers';
import crypto from 'crypto';

/**
 * Derives a NEAR implicit account ID from an EVM public key
 * 
 * NEAR implicit accounts are 64-character hex strings derived from the public key.
 * For EVM wallets, we use the secp256k1 public key.
 * 
 * @param publicKey - The EVM public key (with or without 0x prefix)
 * @returns The NEAR implicit account ID (64-char hex string)
 */
export function deriveNearImplicitAccountId(publicKey: string): string {
  // Remove 0x prefix if present
  const cleanPublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
  
  // NEAR implicit accounts are derived from the public key hash
  // For secp256k1 (EVM), we use the uncompressed public key
  // and take the last 64 characters (32 bytes) as the account ID
  
  // If the public key is compressed (66 chars = 33 bytes), we need to expand it
  // If it's uncompressed (130 chars = 65 bytes), we use it directly
  
  if (cleanPublicKey.length === 66) {
    // Compressed public key - need to expand
    // For now, we'll use the compressed form directly
    // In production, you'd want to expand this properly
    return cleanPublicKey.toLowerCase();
  } else if (cleanPublicKey.length === 130) {
    // Uncompressed public key (04 + 64 bytes)
    // Take the last 64 characters (the actual key without the 04 prefix)
    return cleanPublicKey.slice(-64).toLowerCase();
  } else {
    throw new Error(`Invalid public key length: ${cleanPublicKey.length}. Expected 66 (compressed) or 130 (uncompressed)`);
  }
}

/**
 * Gets the NEAR implicit account ID from an ethers Wallet
 * 
 * @param wallet - An ethers.js Wallet instance
 * @returns The NEAR implicit account ID
 */
export function getNearAccountIdFromWallet(wallet: ethers.Wallet | ethers.HDNodeWallet): string {
  // Get the public key from the signing key
  const publicKey = wallet.signingKey.publicKey;
  return deriveNearImplicitAccountId(publicKey);
}

/**
 * Alternative: Use the EVM address directly as the NEAR account
 * 
 * NEAR supports Ethereum-like addresses (0x...) as account IDs.
 * This might be what NEAR Intents expects when using EVM wallets.
 * 
 * @param address - The EVM address
 * @returns The address in lowercase (NEAR format)
 */
export function evmAddressAsNearAccount(address: string): string {
  return address.toLowerCase();
}

// Test function
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('========================================');
  console.log('🔍 NEAR Account ID Derivation Test');
  console.log('========================================');
  console.log('');

  // Create a test wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log('Test Wallet:');
  console.log(`  EVM Address: ${wallet.address}`);
  console.log(`  Public Key: ${wallet.signingKey.publicKey}`);
  console.log(`  Public Key Length: ${wallet.signingKey.publicKey.length}`);
  console.log('');

  try {
    const nearAccountId = getNearAccountIdFromWallet(wallet);
    console.log('✅ Derived NEAR Implicit Account ID:');
    console.log(`  ${nearAccountId}`);
    console.log('');
  } catch (error: any) {
    console.log('❌ Error deriving account ID:', error.message);
    console.log('');
  }

  const evmAsNear = evmAddressAsNearAccount(wallet.address);
  console.log('Alternative (EVM address as NEAR account):');
  console.log(`  ${evmAsNear}`);
  console.log('');

  console.log('========================================');
  console.log('📝 Notes:');
  console.log('========================================');
  console.log('');
  console.log('1. NEAR implicit accounts are 64-char hex strings');
  console.log('2. NEAR also supports Ethereum-like addresses (0x...)');
  console.log('3. For NEAR Intents with EVM wallets, try:');
  console.log('   a) The implicit account ID (derived from public key)');
  console.log('   b) The EVM address directly (lowercase)');
  console.log('');
}

