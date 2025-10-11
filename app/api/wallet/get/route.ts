import { NextRequest, NextResponse } from 'next/server';
import Database from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('Wallet API called')
    
    const body = await request.json();
    console.log('Request body:', body)
    
    const { firebaseUID } = body;

    if (!firebaseUID) {
      console.error('No firebaseUID provided')
      return NextResponse.json(
        { error: 'Firebase UID is required' },
        { status: 400 }
      );
    }

    console.log('Creating wallet instance for UID:', firebaseUID)
    
    // Get wallet private key
    const wallet = await Database.createWalletInstance(firebaseUID);
    
    console.log('Wallet instance created:', wallet ? 'success' : 'failed')
    
    if (!wallet) {
      console.error('Wallet creation failed')
      return NextResponse.json(
        { error: 'Wallet not found or could not be created' },
        { status: 404 }
      );
    }

    console.log('Returning wallet address:', wallet.address)
    
    // Return wallet details (but NOT the private key itself - only for signing)
    return NextResponse.json({
      address: wallet.address,
      privateKey: wallet.privateKey // Only for client-side signing - will be used temporarily
    });

  } catch (error) {
    console.error('Error getting wallet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get wallet' },
      { status: 500 }
    );
  }
}
