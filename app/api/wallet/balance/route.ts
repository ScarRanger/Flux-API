import { NextRequest, NextResponse } from 'next/server';
import { fetchWalletBalance, NetworkType } from '@/lib/wallet-balance';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const network = (searchParams.get('network') as NetworkType) || 'sepolia';

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate that this is a valid Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Fetch the balance using server-side function
    const result = await fetchWalletBalance(address, network);

    return NextResponse.json({
      success: true,
      data: {
        address,
        balance: result.balance,
        formattedBalance: result.formattedBalance,
        network: result.network,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch wallet balance',
        success: false 
      },
      { status: 500 }
    );
  }
}

// Optional: Add POST method for batch balance requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses, network = 'sepolia' } = body;

    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'addresses array is required' },
        { status: 400 }
      );
    }

    if (addresses.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 addresses allowed per request' },
        { status: 400 }
      );
    }

    // Validate all addresses
    for (const address of addresses) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return NextResponse.json(
          { error: `Invalid wallet address format: ${address}` },
          { status: 400 }
        );
      }
    }

    // Fetch balances for all addresses
    const results = await Promise.allSettled(
      addresses.map((address: string) => fetchWalletBalance(address, network))
    );

    const balances = results.map((result, index) => {
      const address = addresses[index];
      
      if (result.status === 'fulfilled') {
        return {
          address,
          success: true,
          balance: result.value.balance,
          formattedBalance: result.value.formattedBalance,
          network: result.value.network,
        };
      } else {
        return {
          address,
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        balances,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Error fetching wallet balances:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch wallet balances',
        success: false 
      },
      { status: 500 }
    );
  }
}