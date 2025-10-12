'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Server, Zap, TrendingUp, CheckCircle2, XCircle } from 'lucide-react'

interface KeeperNode {
  nodeId: string
  endpointUrl: string
  reputation: number
  requests: number
}

interface NetworkStatus {
  status: string
  decentralized: boolean
  activeKeepers: number
  keepers: KeeperNode[]
}

export function DecentralizedNetworkDashboard() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNetworkStatus()
    // Refresh every 10 seconds
    const interval = setInterval(fetchNetworkStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchNetworkStatus() {
    try {
      const response = await fetch('/api/gateway/proxy', {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch network status')
      }

      const data = await response.json()
      setNetworkStatus(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            Decentralized Network
          </CardTitle>
          <CardDescription>Loading network status...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <XCircle className="h-5 w-5" />
            Network Offline
          </CardTitle>
          <CardDescription className="text-red-600">
            {error}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!networkStatus) {
    return null
  }

  const isHealthy = networkStatus.status === 'healthy' && networkStatus.activeKeepers > 0

  return (
    <div className="space-y-4">
      {/* Network Overview */}
      <Card className={isHealthy ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className={`h-5 w-5 ${isHealthy ? 'text-green-600' : 'text-yellow-600'}`} />
                Decentralized Network Status
              </CardTitle>
              <CardDescription className={isHealthy ? 'text-green-600' : 'text-yellow-600'}>
                {networkStatus.decentralized ? 'Routing through keeper nodes' : 'Centralized mode'}
              </CardDescription>
            </div>
            <Badge 
              variant={isHealthy ? 'default' : 'secondary'}
              className={isHealthy ? 'bg-green-600' : 'bg-yellow-600'}
            >
              {isHealthy ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Healthy
                </>
              ) : (
                <>
                  <Activity className="mr-1 h-3 w-3 animate-pulse" />
                  Degraded
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{networkStatus.activeKeepers}</div>
              <div className="text-sm text-muted-foreground">Active Keepers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">
                {networkStatus.decentralized ? (
                  <Zap className="inline h-8 w-8 text-blue-600" />
                ) : (
                  <Server className="inline h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {networkStatus.decentralized ? 'Decentralized' : 'Centralized'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {networkStatus.keepers.reduce((sum, k) => sum + k.requests, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Requests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keeper Nodes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Keeper Nodes ({networkStatus.keepers.length})
          </CardTitle>
          <CardDescription>
            Active nodes handling API requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {networkStatus.keepers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="mx-auto h-12 w-12 mb-2 opacity-30" />
              <p>No keeper nodes available</p>
              <p className="text-sm mt-1">Start a keeper node to enable decentralized routing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {networkStatus.keepers.map((keeper) => (
                <div
                  key={keeper.nodeId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">{keeper.nodeId}</div>
                      <div className="text-sm text-muted-foreground">{keeper.endpointUrl}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{keeper.reputation}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Reputation</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Activity className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">{keeper.requests}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Requests</div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Decentralized Routing Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">1</span>
              </div>
              <p>Your API request is sent to the smart router</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">2</span>
              </div>
              <p>Router selects the best keeper node using round-robin + reputation</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">3</span>
              </div>
              <p>Keeper node loads encrypted API key from its vault</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">4</span>
              </div>
              <p>Keeper calls the third-party API with proper authentication</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">5</span>
              </div>
              <p>Response returns through keeper → router → you</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">6</span>
              </div>
              <p>Call is logged to blockchain for transparency</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
