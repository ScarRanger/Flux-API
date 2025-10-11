import { ethers } from 'ethers';

// Ethereum network configuration
const ETHEREUM_NETWORKS = {
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    decimals: 18,
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    symbol: 'ETH',
    decimals: 18,
  },
} as const;

export type NetworkType = keyof typeof ETHEREUM_NETWORKS;

/**
 * Fetch the ETH balance for a given wallet address using Alchemy RPC (Server-side only)
 */
export async function fetchWalletBalance(
  walletAddress: string,
  network: NetworkType = 'sepolia'
): Promise<{ balance: string; formattedBalance: string; network: typeof ETHEREUM_NETWORKS[NetworkType] }> {
  try {
    // Get RPC URL from environment (server-side only)
    const rpcUrl = process.env.RPC_URL;
    
    if (!rpcUrl) {
      throw new Error('RPC_URL not configured in environment variables');
    }

    if (rpcUrl.includes('YOUR_ALCHEMY_API_KEY')) {
      throw new Error('Please replace YOUR_ALCHEMY_API_KEY with your actual Alchemy API key');
    }

    // This function should only be called server-side
    if (typeof window !== 'undefined') {
      throw new Error('fetchWalletBalance should only be called server-side');
    }

    // Create provider using Alchemy RPC
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Validate the wallet address
    if (!ethers.isAddress(walletAddress)) {
      throw new Error('Invalid wallet address format');
    }

    // Fetch the balance
    const balanceWei = await provider.getBalance(walletAddress);
    
    // Convert from Wei to ETH
    const balanceEth = ethers.formatEther(balanceWei);
    
    // Format for display (remove trailing zeros)
    const numBalance = parseFloat(balanceEth);
    let formattedBalance: string;
    
    if (numBalance === 0) {
      formattedBalance = "0";
    } else if (numBalance < 0.001) {
      // For very small amounts, show up to 8 decimals but remove trailing zeros
      formattedBalance = parseFloat(numBalance.toFixed(8)).toString();
    } else {
      // For normal amounts, show up to 6 decimals but remove trailing zeros
      formattedBalance = parseFloat(numBalance.toFixed(6)).toString();
    }
    
    return {
      balance: balanceEth,
      formattedBalance,
      network: ETHEREUM_NETWORKS[network],
    };
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    
    // Return a more user-friendly error message
    if (error instanceof Error) {
      throw new Error(`Failed to fetch balance: ${error.message}`);
    }
    
    throw new Error('Failed to fetch wallet balance. Please try again later.');
  }
}

/**
 * Fetch multiple wallet balances in parallel
 */
export async function fetchMultipleWalletBalances(
  walletAddresses: string[],
  network: NetworkType = 'sepolia'
): Promise<Array<{ address: string; balance: string; formattedBalance: string; error?: string }>> {
  const results = await Promise.allSettled(
    walletAddresses.map(async (address) => {
      const result = await fetchWalletBalance(address, network);
      return { address, ...result };
    })
  );

  return results.map((result, index) => {
    const address = walletAddresses[index];
    
    if (result.status === 'fulfilled') {
      return {
        address,
        balance: result.value.balance,
        formattedBalance: result.value.formattedBalance,
      };
    } else {
      return {
        address,
        balance: '0',
        formattedBalance: '0.000000',
        error: result.reason?.message || 'Unknown error',
      };
    }
  });
}

/**
 * Format balance for display with proper units
 */
export function formatBalance(
  balance: string | number,
  symbol: string = 'ETH',
  maxDecimals: number = 6
): string {
  const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance;
  
  if (isNaN(numBalance)) {
    return `0 ${symbol}`;
  }
  
  // For very small amounts, show more decimals
  if (numBalance > 0 && numBalance < 0.001) {
    return `${numBalance.toFixed(8)} ${symbol}`;
  }
  
  // For normal amounts, limit decimals
  return `${numBalance.toFixed(maxDecimals)} ${symbol}`;
}

/**
 * Check if a balance is considered "low" (less than 0.01 ETH on mainnet, 0.1 ETH on testnet)
 */
export function isLowBalance(balance: string, network: NetworkType = 'sepolia'): boolean {
  const numBalance = parseFloat(balance);
  const threshold = network === 'mainnet' ? 0.01 : 0.1;
  return numBalance < threshold;
}