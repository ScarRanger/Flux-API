'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Wallet, LogIn, Shield, Zap } from 'lucide-react';

export function LoginForm() {
  const { signInWithGoogle, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller'>('buyer');
  const router = useRouter();
  const pathname = usePathname();
  
  // Check if we're on signup page to customize messaging
  const isSignupPage = pathname === '/signup';

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
      
      // Store the selected role in localStorage for now (you can enhance this later)
      localStorage.setItem('userRole', selectedRole);
      
      // Redirect based on role
      if (selectedRole === 'seller') {
        router.push('/seller');
      } else {
        router.push('/buyer');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      // You could show a toast notification here
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Wallet className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {isSignupPage ? 'Join API Marketplace' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isSignupPage 
              ? 'Create your account to access decentralized API quotas and get your wallet'
              : 'Sign in to access decentralized API quotas and manage your wallet'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">I am a:</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`
                flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors
                ${selectedRole === 'buyer' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}
              `}>
                <input
                  type="radio"
                  name="role"
                  value="buyer"
                  checked={selectedRole === 'buyer'}
                  onChange={() => setSelectedRole('buyer')}
                  className="sr-only"
                />
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedRole === 'buyer' ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  <span className="text-sm font-medium">Buyer</span>
                </div>
              </label>
              <label className={`
                flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors
                ${selectedRole === 'seller' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}
              `}>
                <input
                  type="radio"
                  name="role"
                  value="seller"
                  checked={selectedRole === 'seller'}
                  onChange={() => setSelectedRole('seller')}
                  className="sr-only"
                />
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedRole === 'seller' ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  <span className="text-sm font-medium">Seller</span>
                </div>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedRole === 'buyer' 
                ? 'Purchase API quotas and manage your consumption'
                : 'List your APIs and earn from quota sales'
              }
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Secure custodial wallet automatically created</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Zap className="w-4 h-4 text-blue-500" />
              <span>Instant micropayments for API calls</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Wallet className="w-4 h-4 text-purple-500" />
              <span>No blockchain knowledge required</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full"
            size="lg"
          >
            {isSigningIn ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                {isSignupPage ? 'Creating your account...' : 'Signing you in...'}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                {isSignupPage ? 'Sign Up with Google' : 'Continue with Google'}
              </>
            )}
          </Button>

          {/* Benefits */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center mb-3">
              {isSignupPage 
                ? 'What happens when you sign up:'
                : 'What happens when you sign in:'
              }
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary" className="text-xs">
                {isSignupPage ? 'Account Created' : 'Wallet Connected'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {isSignupPage ? 'Wallet Created' : 'Profile Loaded'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Ready to Trade
              </Badge>
            </div>
          </div>

          {/* Terms */}
          <p className="text-xs text-muted-foreground text-center">
            By {isSignupPage ? 'signing up' : 'signing in'}, you agree to our{' '}
            <a href="/terms" className="underline hover:text-primary">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="underline hover:text-primary">
              Privacy Policy
            </a>
          </p>

          {/* Navigation between login/signup */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {isSignupPage ? (
                <>
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Sign in here
                  </Link>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <Link href="/signup" className="text-primary hover:underline font-medium">
                    Sign up here
                  </Link>
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}