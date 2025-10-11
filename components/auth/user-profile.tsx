'use client';

import { useAuth, useWallet } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Wallet, 
  Copy, 
  ExternalLink, 
  LogOut,
  Calendar,
  Shield
} from 'lucide-react';
import { useState } from 'react';

export function UserProfile() {
  const { user, dbUser, logout } = useAuth();
  const { walletAddress, hasWallet } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user || !dbUser) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
              <AvatarFallback>
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle>{user.displayName || 'Anonymous User'}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={dbUser.is_active ? 'default' : 'secondary'}>
                  {dbUser.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {hasWallet && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Wallet Connected
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Wallet Information */}
      {hasWallet && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Wallet Information
            </CardTitle>
            <CardDescription>
              Your custodial wallet for API marketplace transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Wallet Address
              </label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                  {walletAddress}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(walletAddress!)}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://sepolia.etherscan.io/address/${walletAddress}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Network</span>
                <p className="font-medium">Sepolia Testnet</p>
              </div>
              <div>
                <span className="text-muted-foreground">Wallet Type</span>
                <p className="font-medium">Custodial</p>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <Shield className="w-4 h-4 inline mr-1" />
                Your private keys are securely encrypted and managed by our system.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Account Created
              </label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(dbUser.created_at)}</span>
              </div>
            </div>
            {dbUser.last_login && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Last Login
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{formatDate(dbUser.last_login)}</span>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                User ID
              </label>
              <p className="text-sm font-mono">{dbUser.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Firebase UID
              </label>
              <p className="text-sm font-mono">{formatAddress(dbUser.firebase_uid)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start">
              <Wallet className="w-4 h-4 mr-2" />
              View Balances
            </Button>
            <Button variant="outline" className="justify-start">
              <ExternalLink className="w-4 h-4 mr-2" />
              Marketplace
            </Button>
            <Button variant="outline" className="justify-start">
              <User className="w-4 h-4 mr-2" />
              Transaction History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}