import { ethers } from 'ethers';
import UsageTrackingABI from '@/smart_contracts/usagetracking.json';

// Contract address - set this after deployment
const USAGE_TRACKING_ADDRESS = process.env.NEXT_PUBLIC_USAGE_TRACKING_ADDRESS || '';

/**
 * Get a read-only contract instance
 */
export function getUsageTrackingContract(providerOrSigner?: ethers.Provider | ethers.Signer) {
  if (!USAGE_TRACKING_ADDRESS) {
    throw new Error('Usage Tracking contract address not configured. Set NEXT_PUBLIC_USAGE_TRACKING_ADDRESS in .env.local');
  }

  const provider = providerOrSigner || new ethers.JsonRpcProvider(process.env.RPC_URL);
  return new ethers.Contract(USAGE_TRACKING_ADDRESS, UsageTrackingABI, provider);
}

/**
 * Log API usage on blockchain
 * @param userWallet - ethers.Wallet instance for the user
 * @param buyerAddress - Buyer's wallet address
 * @param apiId - API listing ID
 * @param calls - Number of calls made (typically 1)
 * @returns Transaction hash
 */
export async function logUsageOnChain(
  userWallet: ethers.Wallet,
  buyerAddress: string,
  apiId: number,
  calls: number = 1
): Promise<{ txHash: string; blockNumber: number }> {
  try {
    const contract = new ethers.Contract(
      USAGE_TRACKING_ADDRESS,
      UsageTrackingABI,
      userWallet
    );

    // Call the logUsage function
    const tx = await contract.logUsage(buyerAddress, apiId, calls);
    
    console.log('Usage logging transaction sent:', tx.hash);
    
    // Wait for 1 confirmation
    const receipt = await tx.wait(1);
    
    console.log('Usage logged on blockchain:', {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Error logging usage on chain:', error);
    throw error;
  }
}

/**
 * Get usage history from blockchain for a user and API
 * @param userAddress - User's wallet address
 * @param apiId - API listing ID
 * @returns Array of usage records
 */
export async function getUsageFromChain(
  userAddress: string,
  apiId: number
): Promise<Array<{ timestamp: bigint; calls: bigint }>> {
  try {
    const contract = getUsageTrackingContract();
    
    // This requires adding a getter function to the contract
    // For now, we'll need to listen to events
    const filter = contract.filters.UsageLogged(userAddress, apiId);
    const events = await contract.queryFilter(filter);
    
    return events
      .filter((event): event is ethers.EventLog => 'args' in event)
      .map(event => ({
        timestamp: event.args![0] as bigint,
        calls: event.args![2] as bigint
      }));
  } catch (error) {
    console.error('Error fetching usage from chain:', error);
    throw error;
  }
}

/**
 * Batch log multiple usage records (more gas efficient)
 * Note: This would require a new contract function
 */
export async function batchLogUsageOnChain(
  userWallet: ethers.Wallet,
  usageRecords: Array<{ buyerAddress: string; apiId: number; calls: number }>
): Promise<{ txHash: string; blockNumber: number }> {
  // This would require a new smart contract function that accepts arrays
  // For now, we'll call logUsage multiple times (not recommended for production)
  throw new Error('Batch logging not yet implemented. Use logUsageOnChain for individual calls.');
}
