'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { LoginForm } from '@/components/auth/login-form';
import { UserProfile } from '@/components/auth/user-profile';
import { Spinner } from '@/components/ui/spinner';

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading during hydration to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner className="w-8 h-8" />
        </div>
      </div>
    );
  }

  return <LoginPageContent />;
}

function LoginPageContent() {
  const [error, setError] = useState<string | null>(null);
  
  let authData;
  try {
    authData = useAuth();
  } catch (err) {
    console.error('Auth error:', err);
    setError('Authentication service unavailable');
  }
  
  const { user, loading } = authData || { user: null, loading: false };

  // If there's an error with auth, show the login form anyway
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center mb-4">
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
            {error} - Showing login form
          </p>
        </div>
        <LoginForm />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner className="w-8 h-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {user ? <UserProfile /> : <LoginForm />}
    </div>
  );
}
