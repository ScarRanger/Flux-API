'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { RoleSelectionDialog } from './role-selection-dialog';

export function RoleSelectionManager() {
  const { 
    showRoleSelection, 
    handleRoleSelection, 
    pendingUserEmail,
    dbUser 
  } = useAuth();
  const router = useRouter();

  // Redirect user after role selection completes
  useEffect(() => {
    if (dbUser && !showRoleSelection) {
      // Redirect based on role
      if (dbUser.role === 'seller') {
        router.push('/seller');
      } else {
        router.push('/buyer');
      }
    }
  }, [dbUser, showRoleSelection, router]);

  const handleRoleSelect = async (role: 'buyer' | 'seller') => {
    await handleRoleSelection(role);
  };

  return (
    <RoleSelectionDialog
      open={showRoleSelection}
      onRoleSelected={handleRoleSelect}
      userEmail={pendingUserEmail}
    />
  );
}
