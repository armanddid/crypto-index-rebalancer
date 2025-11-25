/**
 * NEAR Protocol utilities
 */

/**
 * Get the NEAR RPC URL based on environment
 * 
 * @returns NEAR RPC URL
 */
export function getNearRpcUrl(): string {
  const customRpc = process.env.NEAR_RPC_URL;
  
  if (customRpc) {
    return customRpc;
  }

  // Default to mainnet
  return 'https://rpc.mainnet.near.org';
}

/**
 * Get the NEAR network ID
 * 
 * @returns Network ID ('mainnet' or 'testnet')
 */
export function getNearNetworkId(): string {
  return process.env.NEAR_NETWORK_ID || 'mainnet';
}

