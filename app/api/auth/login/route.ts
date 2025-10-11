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

    // Update last login
    await WalletDB.updateLastLogin(firebaseUID);

    // Get user data
    const user = await WalletDB.getUserByFirebaseUID(firebaseUID);

    if (user) {
      // Log audit event
      await WalletDB.logAuditEvent(
        user.id,
        'USER_LOGIN',
        'user',
        user.id,
        null,
        { login_time: new Date() },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || undefined
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in login API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}