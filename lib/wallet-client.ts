// Client-side utility for wallet balance operations

export interface WalletBalanceResponse {
  success: boolean;
  data?: {
    address: string;
    balance: string;
    formattedBalance: string;
    network: {
      chainId: number;
      name: string;
      symbol: string;
      decimals: number;
    };
    timestamp: string;
  };
  error?: string;
}

export interface BatchWalletBalanceResponse {
  success: boolean;
  data?: {
    balances: Array<{
      address: string;
      success: boolean;
      balance?: string;
      formattedBalance?: string;
      network?: {
        chainId: number;
        name: string;
        symbol: string;
        decimals: number;
      };
      error?: string;
    }>;
    timestamp: string;
  };
  error?: string;
}

/**
 * Fetch wallet balance from server-side API
 */
export async function fetchWalletBalanceFromAPI(
  walletAddress: string,
  network: 'mainnet' | 'sepolia' = 'sepolia'
): Promise<WalletBalanceResponse> {
  try {
    const response = await fetch(
      `/api/wallet/balance?address=${encodeURIComponent(walletAddress)}&network=${network}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching wallet balance from API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch wallet balance',
    };
  }
}

/**
 * Fetch multiple wallet balances from server-side API
 */
export async function fetchMultipleWalletBalancesFromAPI(
  walletAddresses: string[],
  network: 'mainnet' | 'sepolia' = 'sepolia'
): Promise<BatchWalletBalanceResponse> {
  try {
    const response = await fetch('/api/wallet/balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: walletAddresses,
        network,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching wallet balances from API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch wallet balances',
    };
  }
}

/**
 * Format balance for display with proper units and remove trailing zeros
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
  
  // For zero balance, return clean zero
  if (numBalance === 0) {
    return `0 ${symbol}`;
  }
  
  // For very small amounts, show more decimals but remove trailing zeros
  if (numBalance > 0 && numBalance < 0.001) {
    return `${parseFloat(numBalance.toFixed(8))} ${symbol}`;
  }
  
  // For normal amounts, limit decimals and remove trailing zeros
  return `${parseFloat(numBalance.toFixed(maxDecimals))} ${symbol}`;
}

/**
 * Format balance number only (without symbol) and remove trailing zeros
 */
export function formatBalanceNumber(
  balance: string | number,
  maxDecimals: number = 6
): string {
  const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance;
  
  if (isNaN(numBalance)) {
    return '0';
  }
  
  // For zero balance, return clean zero
  if (numBalance === 0) {
    return '0';
  }
  
  // For very small amounts, show more decimals but remove trailing zeros
  if (numBalance > 0 && numBalance < 0.001) {
    return parseFloat(numBalance.toFixed(8)).toString();
  }
  
  // For normal amounts, limit decimals and remove trailing zeros
  return parseFloat(numBalance.toFixed(maxDecimals)).toString();
}

/**
 * Check if a balance is considered "low" (less than 0.01 ETH on mainnet, 0.1 ETH on testnet)
 */
export function isLowBalance(balance: string, network: 'mainnet' | 'sepolia' = 'sepolia'): boolean {
  const numBalance = parseFloat(balance);
  const threshold = network === 'mainnet' ? 0.01 : 0.1;
  return numBalance < threshold;
}