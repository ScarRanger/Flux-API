'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const [hasRedirected, setHasRedirected] = useState(() => {
    // Initialize from sessionStorage to persist across navigation
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('role_redirect_done') === 'true';
    }
    return false;
  });

  // Redirect user after role selection completes
  useEffect(() => {
    if (dbUser && !showRoleSelection && !hasRedirected) {
      // Mark as redirected in both state and sessionStorage
      setHasRedirected(true);
      sessionStorage.setItem('role_redirect_done', 'true');
      
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
      sessionStorage.removeItem('role_redirect_done');
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
