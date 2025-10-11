import { NextRequest, NextResponse } from 'next/server';
import { WalletDB } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { firebaseUID, email, displayName, photoURL } = await request.json();

    if (!firebaseUID || !email) {
      return NextResponse.json(
        { error: 'Firebase UID and email are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let user = await WalletDB.getUserByFirebaseUID(firebaseUID);

    if (!user) {
      // Create new user with wallet
      user = await WalletDB.createUser({
        uid: firebaseUID,
        email,
        displayName,
        photoURL,
      });

      // Initialize user balances
      await WalletDB.initializeUserBalances(user.id);

      // Log audit event
      await WalletDB.logAuditEvent(
        user.id,
        'USER_CREATED',
        'user',
        user.id,
        null,
        { email, displayName, wallet_address: user.wallet_address },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || undefined
      );

      console.log(`New user created: ${email} with wallet: ${user.wallet_address}`);
    } else {
      // Update existing user profile if needed
      const updates: any = {};
      if (user.email !== email) updates.email = email;
      if (user.display_name !== displayName) updates.display_name = displayName;
      if (user.photo_url !== photoURL) updates.photo_url = photoURL;

      if (Object.keys(updates).length > 0) {
        const oldValues = {
          email: user.email,
          display_name: user.display_name,
          photo_url: user.photo_url,
        };

        user = await WalletDB.updateUserProfile(firebaseUID, updates);

        // Log audit event
        await WalletDB.logAuditEvent(
          user!.id,
          'USER_PROFILE_UPDATED',
          'user',
          user!.id,
          oldValues,
          updates,
          request.headers.get('x-forwarded-for') || 'unknown',
          request.headers.get('user-agent') || undefined
        );
      }
    }

    // Remove sensitive data before sending response
    const safeUser = {
      ...user,
      encrypted_private_key: undefined,
      encryption_salt: undefined,
    };

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Error in user API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}