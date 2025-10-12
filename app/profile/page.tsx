"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth, useWallet } from "@/lib/auth-context"
import { fetchWalletBalanceFromAPI, formatBalance, formatBalanceNumber, isLowBalance } from "@/lib/wallet-client"
import { EscrowSummary } from "@/components/shared/escrow-summary"
import { EscrowManager } from "@/components/shared/escrow-manager"
import { Wallet, User, LogOut, ArrowLeft, RefreshCw, AlertTriangle, ExternalLink, Shield } from "lucide-react"

// Extend window type for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

export default function ProfilePage() {
  const { user, dbUser, logout, showRoleSelection } = useAuth()
  const { walletAddress, createWalletInstance } = useWallet()
  const router = useRouter()
  const [balance, setBalance] = useState<string>("0")
  const [formattedBalance, setFormattedBalance] = useState<string>("0.000000")
  const [isLoading, setIsLoading] = useState(true)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [provider, setProvider] = useState<any>(null)

  useEffect(() => {
    // Initialize provider for escrow interactions
    if (typeof window !== 'undefined' && window.ethereum) {
      import('ethers').then(({ ethers }) => {
        const browserProvider = new ethers.BrowserProvider(window.ethereum)
        setProvider(browserProvider)
      })
    }

    // Don't redirect if role selection is in progress
    if (showRoleSelection) {
      return
    }

    if (!user || !dbUser) {
      router.push("/login")
      return
    }

    // Fetch wallet balance
    const fetchBalance = async () => {
      try {
        setBalanceError(null)
        if (walletAddress) {
          console.log('Fetching balance for address:', walletAddress)
          const result = await fetchWalletBalanceFromAPI(walletAddress, 'sepolia')
          
          if (result.success && result.data) {
            setBalance(result.data.balance)
            setFormattedBalance(result.data.formattedBalance)
            console.log('Balance fetched successfully:', result.data.formattedBalance)
          } else {
            throw new Error(result.error || 'Failed to fetch balance')
          }
        }
      } catch (error) {
        console.error("Error fetching balance:", error)
        setBalanceError(error instanceof Error ? error.message : "Failed to fetch balance")
        // Keep previous balance values on error
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }

    fetchBalance()
  }, [user, dbUser, walletAddress, router])

  const handleRefreshBalance = async () => {
    if (!walletAddress || isRefreshing) return
    
    setIsRefreshing(true)
    setBalanceError(null)
    
    try {
      const result = await fetchWalletBalanceFromAPI(walletAddress, 'sepolia')
      
      if (result.success && result.data) {
        setBalance(result.data.balance)
        setFormattedBalance(result.data.formattedBalance)
      } else {
        throw new Error(result.error || 'Failed to refresh balance')
      }
    } catch (error) {
      console.error("Error refreshing balance:", error)
      setBalanceError(error instanceof Error ? error.message : "Failed to refresh balance")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  const handleBack = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user || !dbUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
              <AvatarFallback>
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">{user.displayName || "User"}</CardTitle>
              <CardDescription className="text-base">{user.email}</CardDescription>
              <Badge variant={dbUser.role === "seller" ? "default" : "secondary"} className="mt-2">
                {dbUser.role === "seller" ? "API Seller" : "API Buyer"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Escrow Stakes Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              API Security Stakes
            </CardTitle>
            <CardDescription>
              Your 0.1 ETH security stakes for purchased API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EscrowSummary 
              userAddress={walletAddress || undefined}
              provider={provider}
            />
          </CardContent>
        </Card>

        {/* Detailed Escrow Management */}
        <div id="escrow-manager" className="mb-6">
          <EscrowManager 
            userAddress={walletAddress || undefined}
            provider={provider}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wallet Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet Information
              </CardTitle>
              <CardDescription>
                Your custodial wallet details and balance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                <div className="mt-1 font-mono text-sm bg-muted p-2 rounded border break-all flex items-center justify-between">
                  <span>{walletAddress || "Loading..."}</span>
                  {walletAddress && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://sepolia.etherscan.io/address/${walletAddress}`, '_blank')}
                      className="ml-2 h-6 w-6 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">Balance</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshBalance}
                    disabled={isRefreshing || !walletAddress}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="mt-1">
                  {balanceError ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{balanceError}</span>
                      </div>
                      {balanceError.includes('YOUR_ALCHEMY_API_KEY') && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>Setup Required:</strong> Please update your <code>.env.local</code> file with your actual Alchemy API key.
                            <br />
                            Get one free at: <a href="https://alchemy.com" target="_blank" rel="noopener noreferrer" className="underline">alchemy.com</a>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {isLoading || isRefreshing ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span>Loading...</span>
                          </div>
                        ) : (
                          <span>
                            {formatBalanceNumber(formattedBalance)} <span className="text-lg font-normal text-muted-foreground">ETH</span>
                          </span>
                        )}
                      </span>
                      {!isLoading && !isRefreshing && isLowBalance(balance) && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Low Balance
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Sepolia Testnet • Updated {isRefreshing ? 'now' : 'recently'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                <div className="mt-1">
                  <Badge variant={dbUser.role === "seller" ? "default" : "secondary"}>
                    {dbUser.role === "seller" ? "API Seller" : "API Buyer"}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="mt-1 text-sm">
                  {user.email}
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                <div className="mt-1 text-sm">
                  {user.metadata?.creationTime ? 
                    new Date(user.metadata.creationTime).toLocaleDateString() : 
                    "Recently joined"
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role-specific Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              {dbUser.role === "seller" 
                ? "Manage your APIs and view analytics" 
                : "Browse marketplace and manage subscriptions"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <a href="/marketplace">Browse Marketplace</a>
              </Button>
              {dbUser.role === "seller" && (
                <>
                  <Button variant="outline" asChild>
                    <a href="/seller">Seller Dashboard</a>
                  </Button>
                </>
              )}
              {dbUser.role === "buyer" && (
                <Button variant="outline" asChild>
                  <a href="/buyer">Buyer Dashboard</a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}