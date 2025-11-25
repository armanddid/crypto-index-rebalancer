// Cryptographic utilities for encrypting/decrypting private keys

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.WALLET_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('WALLET_ENCRYPTION_KEY environment variable is not set');
  }
  if (key.length !== 32) {
    throw new Error('WALLET_ENCRYPTION_KEY must be exactly 32 characters');
  }
  return Buffer.from(key, 'utf8');
}

/**
 * Encrypt a private key
 * @param privateKey - The private key to encrypt
 * @returns Encrypted private key as base64 string
 */
export function encryptPrivateKey(privateKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + encrypted data + auth tag
  const combined = Buffer.concat([
    iv,
    Buffer.from(encrypted, 'hex'),
    authTag,
  ]);
  
  return combined.toString('base64');
}

/**
 * Decrypt a private key
 * @param encryptedPrivateKey - The encrypted private key as base64 string
 * @returns Decrypted private key
 */
export function decryptPrivateKey(encryptedPrivateKey: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedPrivateKey, 'base64');
  
  // Extract IV, encrypted data, and auth tag
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a random API key
 * @param length - Length of the API key (default: 32)
 * @returns Random API key
 */
export function generateApiKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a random webhook secret
 * @param length - Length of the secret (default: 32)
 * @returns Random webhook secret
 */
export function generateWebhookSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a webhook payload for signature verification
 * @param payload - The webhook payload
 * @param secret - The webhook secret
 * @returns HMAC signature
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify a webhook signature
 * @param payload - The webhook payload
 * @param secret - The webhook secret
 * @param signature - The signature to verify
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  secret: string,
  signature: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Generate a random ID
 * @param prefix - Prefix for the ID (e.g., 'usr', 'acc', 'idx')
 * @param length - Length of the random part (default: 16)
 * @returns Random ID with prefix
 */
export function generateId(prefix: string, length: number = 16): string {
  const randomPart = crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  return `${prefix}_${randomPart}`;
}

