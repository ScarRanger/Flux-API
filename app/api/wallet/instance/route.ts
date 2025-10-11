import { NextRequest, NextResponse } from 'next/server';
import { WalletDB } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { firebaseUID } = await request.json();

    if (!firebaseUID) {
      return NextResponse.json(
        { error: 'Firebase UID is required' },
        { status: 400 }
      );
    }

    // Create wallet instance (this returns a wallet object, not the private key)
    const wallet = await WalletDB.createWalletInstance(firebaseUID);

    if (!wallet) {
      return NextResponse.json(
        { error: 'User not found or wallet creation failed' },
        { status: 404 }
      );
    }

    // Return only public information
    const walletInfo = {
      address: wallet.address,
      // Note: Never return private key or mnemonic
    };

    return NextResponse.json({ wallet: walletInfo });
  } catch (error) {
    console.error('Error creating wallet instance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}