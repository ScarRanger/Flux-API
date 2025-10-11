import { NextRequest, NextResponse } from 'next/server';
import WalletDB from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { firebaseUID, role } = await request.json();

    if (!firebaseUID || !role) {
      return NextResponse.json(
        { error: 'Firebase UID and role are required' },
        { status: 400 }
      );
    }

    if (role !== 'buyer' && role !== 'seller') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "buyer" or "seller"' },
        { status: 400 }
      );
    }

    // Get the user
    const user = await WalletDB.getUserByFirebaseUID(firebaseUID);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update the role
    const oldRole = user.role;
    const updatedUser = await WalletDB.updateUserProfile(firebaseUID, { role });

    // Log audit event
    await WalletDB.logAuditEvent(
      user.id,
      'USER_ROLE_UPDATED',
      'user',
      user.id,
      { role: oldRole },
      { role },
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || undefined
    );

    console.log(`User role updated: ${user.email} from ${oldRole} to ${role}`);

    // Remove sensitive data before sending response
    const safeUser = {
      ...updatedUser,
      encrypted_private_key: undefined,
      encryption_salt: undefined,
    };

    return NextResponse.json({ 
      success: true, 
      user: safeUser,
      message: `Role updated to ${role}` 
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
