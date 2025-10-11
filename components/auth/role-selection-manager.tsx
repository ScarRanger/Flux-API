'use client';

import { useEffect, useState } from 'react';
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
  const [hasRedirected, setHasRedirected] = useState(false);

  // Redirect user after role selection completes
  useEffect(() => {
    if (dbUser && !showRoleSelection && !hasRedirected) {
      setHasRedirected(true);
      // Redirect based on role
      if (dbUser.role === 'seller') {
        router.push('/seller');
      } else {
        router.push('/buyer');
      }
    }
  }, [dbUser, showRoleSelection, router, hasRedirected]);

  // Reset redirect flag when role selection opens again
  useEffect(() => {
    if (showRoleSelection) {
      setHasRedirected(false);
    }
  }, [showRoleSelection]);

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
