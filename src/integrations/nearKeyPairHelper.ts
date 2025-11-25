/**
 * NEAR KeyPair Helper for INTENTS
 * 
 * For INTENTS swaps, we need NEAR ed25519 keys to sign transactions.
 * This helper generates and manages NEAR keys for EVM wallets.
 */

import { KeyPair } from 'near-api-js';
import crypto from 'crypto';
import bs58 from 'bs58';
import { logger } from '../utils/logger.js';

/**
 * Generate a NEAR ed25519 KeyPair from an EVM private key
 * 
 * We derive a deterministic ed25519 key from the EVM private key
 * so that the same EVM wallet always gets the same NEAR key.
 * 
 * @param evmPrivateKey - EVM private key (with or without 0x prefix)
 * @returns NEAR KeyPair (ed25519)
 */
export function generateNearKeyPairFromEVM(evmPrivateKey: string): KeyPair {
  // Remove 0x prefix if present
  const cleanKey = evmPrivateKey.startsWith('0x') ? evmPrivateKey.slice(2) : evmPrivateKey;
  
  // Derive a deterministic ed25519 seed from the EVM private key
  // We use HKDF to derive a 64-byte seed for ed25519 (32 bytes for secret key + 32 bytes for public key)
  const salt = Buffer.from('NEAR_INTENTS_KEY_DERIVATION', 'utf8');
  const info = Buffer.from('ed25519-keypair', 'utf8');
  const keyMaterial = Buffer.from(cleanKey, 'hex');
  
  // Use HKDF to derive the full 64-byte keypair
  const keypairBytes = crypto.hkdfSync('sha256', keyMaterial, salt, info, 64);
  
  // NEAR KeyPair.fromString expects format: "ed25519:base58_encoded_secret_key"
  // The secret key is the first 32 bytes
  const secretKey = keypairBytes.slice(0, 32);
  
  // Convert to base58 for NEAR format (bs58 expects Uint8Array)
  const secretKeyBase58 = bs58.encode(new Uint8Array(secretKey));
  
  // Create ed25519 KeyPair from the secret key
  const keyPair = KeyPair.fromString(`ed25519:${secretKeyBase58}`);
  
  logger.debug('Generated NEAR KeyPair from EVM key', {
    publicKey: keyPair.getPublicKey().toString(),
  });
  
  return keyPair;
}

/**
 * Get the NEAR account ID for an EVM address
 * 
 * For INTENTS, the NEAR account ID is the lowercase EVM address
 * 
 * @param evmAddress - EVM address (with or without 0x prefix)
 * @returns NEAR account ID (lowercase EVM address)
 */
export function getNearAccountIdForEVM(evmAddress: string): string {
  return evmAddress.toLowerCase();
}

/**
 * Get NEAR private key string from KeyPair
 * 
 * @param keyPair - NEAR KeyPair
 * @returns Private key string in NEAR format
 */
export function getNearPrivateKeyString(keyPair: KeyPair): string {
  return keyPair.toString();
}

