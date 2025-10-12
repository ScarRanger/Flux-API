'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { EscrowClient, APIKeyStake, STAKE_AMOUNT } from '@/lib/escrow-client'
import { Wallet, Clock, Shield, AlertTriangle } from 'lucide-react'

interface EscrowManagerProps {
  userAddress?: string
  provider?: ethers.Provider
  signer?: ethers.Signer
}

export function EscrowManager({ userAddress, provider, signer }: EscrowManagerProps) {
  const [stakes, setStakes] = useState<APIKeyStake[]>([])
  const [totalStaked, setTotalStaked] = useState<bigint>(BigInt(0))
  const [loading, setLoading] = useState(true)
  const [escrowClient, setEscrowClient] = useState<EscrowClient | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (provider) {
      const client = new EscrowClient(provider, signer)
      setEscrowClient(client)
    }
  }, [provider, signer])

  useEffect(() => {
    if (userAddress) {
      loadStakeData()
    }
  }, [userAddress])

  const loadStakeData = async () => {
    if (!userAddress) return

    try {
      setLoading(true)
      
      // Get stake info from our API which checks the database
      const response = await fetch(`/api/escrow/stakes?address=${userAddress}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        // Convert the API response to our expected format
        setTotalStaked(BigInt(Math.floor(parseFloat(result.data.totalStaked) * 1e18))) // Convert ETH to wei
        
        // For detailed stakes, we'll show a summary since individual stake details
        // are not available from the current deployed contract
        const mockStakes: APIKeyStake[] = []
        setStakes(mockStakes)
      } else {
        setStakes([])
        setTotalStaked(BigInt(0))
      }

    } catch (error) {
      console.error('Error loading stake data:', error)
      // Set default values instead of showing error
      setStakes([])
      setTotalStaked(BigInt(0))
      // Don't show toast error to user for contract compatibility issues
    } finally {
      setLoading(false)
    }
  }

  const handleWithdrawStake = async (apiKeyHash: string) => {
    if (!escrowClient || !signer) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to manage stakes.",
        variant: "destructive"
      })
      return
    }

    try {
      const tx = await escrowClient.requestStakeWithdrawal(apiKeyHash)
      
      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted. You can complete withdrawal after the 7-day lock period.",
      })

      // Reload data after transaction
      await loadStakeData()
    } catch (error) {
      console.error('Error requesting withdrawal:', error)
      toast({
        title: "Withdrawal Failed",
        description: "Failed to request withdrawal. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleCompleteWithdrawal = async (apiKeyHash: string) => {
    if (!escrowClient || !signer) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to manage stakes.",
        variant: "destructive"
      })
      return
    }

    try {
      const tx = await escrowClient.withdrawStake(apiKeyHash)
      
      toast({
        title: "Stake Withdrawn",
        description: "Your stake has been successfully withdrawn.",
      })

      // Reload data after transaction
      await loadStakeData()
    } catch (error) {
      console.error('Error completing withdrawal:', error)
      toast({
        title: "Withdrawal Failed",
        description: "Failed to complete withdrawal. Please try again.",
        variant: "destructive"
      })
    }
  }

  const formatEth = (wei: bigint) => {
    return ethers.formatEther(wei)
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  const canCompleteWithdrawal = (stake: APIKeyStake) => {
    if (stake.withdrawalRequestTime === BigInt(0)) return false
    const now = Math.floor(Date.now() / 1000)
    const withdrawalTime = Number(stake.withdrawalRequestTime) + (7 * 24 * 60 * 60) // 7 days
    return now >= withdrawalTime
  }

  const getStakeStatus = (stake: APIKeyStake) => {
    if (stake.slashed) return { label: 'Slashed', variant: 'destructive' as const }
    if (!stake.isActive) return { label: 'Withdrawn', variant: 'secondary' as const }
    if (stake.withdrawalRequestTime > BigInt(0)) {
      return canCompleteWithdrawal(stake) 
        ? { label: 'Ready for Withdrawal', variant: 'default' as const }
        : { label: 'Withdrawal Pending', variant: 'secondary' as const }
    }
    return { label: 'Active', variant: 'default' as const }
  }

  if (!userAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Escrow Stakes
          </CardTitle>
          <CardDescription>
            Connect your wallet to view and manage your API key stakes
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Escrow Stakes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Escrow Overview
          </CardTitle>
          <CardDescription>
            Your API key security stakes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Total Staked</span>
              </div>
              <p className="text-2xl font-bold">{formatEth(totalStaked)} ETH</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Active Stakes</span>
              </div>
              <p className="text-2xl font-bold">
                {stakes.filter(s => s.isActive && !s.slashed).length}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Minimum Stake</span>
              </div>
              <p className="text-2xl font-bold">{formatEth(STAKE_AMOUNT)} ETH</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stakes List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Stakes</CardTitle>
          <CardDescription>
            Manage your individual API key stakes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stakes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No detailed stakes available</p>
              <p className="text-sm">The 0.1 ETH staking system is active in the marketplace</p>
              <p className="text-xs mt-2 text-blue-600">
                Detailed stake management requires updated contract deployment
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stakes.map((stake, index) => {
                const status = getStakeStatus(stake)
                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">API Key: {stake.apiKeyHash.slice(0, 8)}...{stake.apiKeyHash.slice(-6)}</p>
                        <p className="text-sm text-muted-foreground">Seller: {stake.seller.slice(0, 6)}...{stake.seller.slice(-4)}</p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Stake Amount:</span>
                        <p className="font-medium">{formatEth(stake.stakeAmount)} ETH</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <p className="font-medium">{formatDate(stake.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Activity:</span>
                        <p className="font-medium">{formatDate(stake.lastActivity)}</p>
                      </div>
                      {stake.slashed && (
                        <div>
                          <span className="text-muted-foreground">Slashed:</span>
                          <p className="font-medium text-red-600">{formatEth(stake.slashAmount)} ETH</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {stake.isActive && !stake.slashed && (
                      <div className="mt-4 flex gap-2">
                        {stake.withdrawalRequestTime === BigInt(0) ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Request Withdrawal
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Request Stake Withdrawal</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to request withdrawal of this stake? 
                                  You will need to wait 7 days before you can complete the withdrawal.
                                  During this time, you will lose API access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleWithdrawStake(stake.apiKeyHash)}>
                                  Request Withdrawal
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : canCompleteWithdrawal(stake) ? (
                          <Button 
                            size="sm" 
                            onClick={() => handleCompleteWithdrawal(stake.apiKeyHash)}
                          >
                            Complete Withdrawal
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            Withdrawal Pending ({Math.ceil((Number(stake.withdrawalRequestTime) + 7 * 24 * 60 * 60 - Date.now() / 1000) / (24 * 60 * 60))} days left)
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}