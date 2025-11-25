// Wallet generation and management using Ethers.js

import { ethers } from 'ethers';
import { Wallet } from '../types/index.js';
import { encryptPrivateKey, decryptPrivateKey } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

/**
 * Generate a new EVM wallet
 * @returns Wallet with address and private key
 */
export function generateWallet(): Wallet {
  const wallet = ethers.Wallet.createRandom();
  
  logger.info(`Generated new wallet: ${wallet.address}`);
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase,
  };
}

/**
 * Get wallet from private key
 * @param privateKey - The private key
 * @returns Wallet instance
 */
export function getWalletFromPrivateKey(privateKey: string): Wallet {
  const wallet = new ethers.Wallet(privateKey);
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Encrypt and store a private key
 * @param privateKey - The private key to encrypt
 * @returns Encrypted private key
 */
export function encryptWalletPrivateKey(privateKey: string): string {
  return encryptPrivateKey(privateKey);
}

/**
 * Decrypt a stored private key
 * @param encryptedPrivateKey - The encrypted private key
 * @returns Decrypted private key
 */
export function decryptWalletPrivateKey(encryptedPrivateKey: string): string {
  return decryptPrivateKey(encryptedPrivateKey);
}

/**
 * Get wallet instance from encrypted private key
 * @param encryptedPrivateKey - The encrypted private key
 * @returns Wallet instance
 */
export function getWalletFromEncrypted(encryptedPrivateKey: string): Wallet {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  return getWalletFromPrivateKey(privateKey);
}

/**
 * Generate deposit addresses for multiple chains
 * For now, we'll use the same EVM address for Ethereum
 * In production, you'd integrate with NEAR Intents to get actual deposit addresses
 * 
 * @param walletAddress - The EVM wallet address
 * @returns Deposit addresses for different chains
 */
export function generateDepositAddresses(walletAddress: string): {
  ethereum?: string;
  solana?: string;
  near?: string;
  bitcoin?: string;
} {
  // For MVP, we'll just use the EVM address for Ethereum
  // In production, integrate with NEAR Intents API to get actual deposit addresses
  return {
    ethereum: walletAddress,
    // These would come from NEAR Intents in production:
    // solana: await nearIntents.getDepositAddress('solana', walletAddress),
    // near: await nearIntents.getDepositAddress('near', walletAddress),
    // bitcoin: await nearIntents.getDepositAddress('bitcoin', walletAddress),
  };
}

/**
 * Validate an Ethereum address
 * @param address - The address to validate
 * @returns True if valid
 */
export function isValidEthereumAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Sign a message with a wallet
 * @param encryptedPrivateKey - The encrypted private key
 * @param message - The message to sign
 * @returns Signature
 */
export async function signMessage(encryptedPrivateKey: string, message: string): Promise<string> {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const wallet = new ethers.Wallet(privateKey);
  return wallet.signMessage(message);
}

/**
 * Verify a signed message
 * @param message - The original message
 * @param signature - The signature
 * @param expectedAddress - The expected signer address
 * @returns True if signature is valid
 */
export function verifySignature(message: string, signature: string, expectedAddress: string): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    logger.error('Error verifying signature:', error);
    return false;
  }
}

