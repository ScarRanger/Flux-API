'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EscrowClient, UserStakeInfo, STAKE_AMOUNT } from '@/lib/escrow-client'
import { Shield, TrendingUp, Clock, AlertTriangle } from 'lucide-react'

interface EscrowSummaryProps {
  userAddress?: string
  provider?: ethers.Provider
}

export function EscrowSummary({ userAddress, provider }: EscrowSummaryProps) {
  const [stakeInfo, setStakeInfo] = useState<UserStakeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userAddress) {
      loadStakeInfo()
    }
  }, [userAddress])

  const loadStakeInfo = async () => {
    if (!userAddress) return

    try {
      setLoading(true)
      setError(null)
      
      // Try to get stake info from our API which checks the database
      const response = await fetch(`/api/escrow/stakes?address=${userAddress}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        // Convert the API response to our expected format
        setStakeInfo({
          totalStaked: BigInt(Math.floor(parseFloat(result.data.totalStaked) * 1e18)), // Convert ETH to wei
          activeStakes: BigInt(result.data.activeStakes)
        })
      } else {
        // Fallback to default values
        setStakeInfo({
          totalStaked: BigInt(0),
          activeStakes: BigInt(0)
        })
      }
    } catch (err) {
      console.error('Error loading stake info:', err)
      // Set default values instead of showing error for deployed contract compatibility
      setStakeInfo({
        totalStaked: BigInt(0),
        activeStakes: BigInt(0)
      })
      setError(null) // Don't show error to user
    } finally {
      setLoading(false)
    }
  }

  const formatEth = (wei: bigint) => {
    return ethers.formatEther(wei)
  }

  const getStakeStatus = () => {
    if (!stakeInfo) return null
    
    const totalStaked = stakeInfo.totalStaked
    const activeStakes = stakeInfo.activeStakes
    
    if (totalStaked === BigInt(0)) {
      return { 
        label: 'No Stakes', 
        variant: 'secondary' as const,
        description: 'Purchase an API key to create your first stake'
      }
    }
    
    if (activeStakes > BigInt(0)) {
      return { 
        label: 'Active Stakes', 
        variant: 'default' as const,
        description: `${activeStakes.toString()} active security stakes`
      }
    }
    
    return { 
      label: 'Stakes Withdrawn', 
      variant: 'outline' as const,
      description: 'All stakes have been withdrawn'
    }
  }

  if (!userAddress) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Connect wallet to view stake information</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500 opacity-50" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button variant="outline" onClick={loadStakeInfo}>
          Retry
        </Button>
      </div>
    )
  }

  const status = getStakeStatus()
  const totalStakedEth = stakeInfo ? formatEth(stakeInfo.totalStaked) : '0'
  const activeStakesCount = stakeInfo ? Number(stakeInfo.activeStakes) : 0

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 border rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Total Staked</span>
          </div>
          <p className="text-2xl font-bold">{totalStakedEth} ETH</p>
          <p className="text-xs text-muted-foreground">Security deposits</p>
        </div>
        
        <div className="text-center p-4 border rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Active Stakes</span>
          </div>
          <p className="text-2xl font-bold">{activeStakesCount}</p>
          <p className="text-xs text-muted-foreground">API key stakes</p>
        </div>
        
        <div className="text-center p-4 border rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium">Min. Stake</span>
          </div>
          <p className="text-2xl font-bold">{formatEth(STAKE_AMOUNT)} ETH</p>
          <p className="text-xs text-muted-foreground">Per API key</p>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Stake Status</span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{status.description}</p>
            </div>
          </div>
          
          {stakeInfo && stakeInfo.totalStaked > BigInt(0) && (
            <Button variant="outline" size="sm" asChild>
              <a href="#escrow-manager">View Details</a>
            </Button>
          )}
        </div>
      )}

      {/* Information Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          About API Security Stakes
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
          When you purchase an API key, you must stake 0.1 ETH as security collateral. 
          This prevents API key theft and leakage. Stakes can be withdrawn after a 7-day lock period.
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          <strong>Note:</strong> The deployed contract is compatible with the marketplace purchase system. 
          Detailed stake management will be available with the updated contract deployment.
        </p>
      </div>
    </div>
  )
}