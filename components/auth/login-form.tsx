'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Wallet, LogIn, Shield, Zap } from 'lucide-react';

export function LoginForm() {
  const { signInWithGoogle, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
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
          <CardTitle className="text-2xl">Welcome to API Marketplace</CardTitle>
          <CardDescription>
            Sign in to access decentralized API quotas and manage your wallet
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
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
                Creating your wallet...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Continue with Google
              </>
            )}
          </Button>

          {/* Benefits */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center mb-3">
              What happens when you sign in:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary" className="text-xs">
                Wallet Created
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Profile Setup
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Ready to Trade
              </Badge>
            </div>
          </div>

          {/* Terms */}
          <p className="text-xs text-muted-foreground text-center">
            By signing in, you agree to our{' '}
            <a href="/terms" className="underline hover:text-primary">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="underline hover:text-primary">
              Privacy Policy
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}