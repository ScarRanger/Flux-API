'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoginForm } from '@/components/auth/login-form';
import { Spinner } from '@/components/ui/spinner';

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If user is logged in, redirect to profile page
  useEffect(() => {
    if (user) {
      router.push('/profile');
    }
  }, [user, router]);

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
      <LoginForm />
    </div>
  );
}
