"use client"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ExternalLink, 
  Database,
  ArrowLeft,
  Activity,
  Clock,
  Zap,
  Box
} from 'lucide-react'
import Link from 'next/link'

interface BlockchainLog {
  id: number
  timestamp: string
  request: {
    method: string
    path: string
    statusCode: number
    responseTime: number
  }
  blockchain: {
    txHash: string
    blockNumber: number
    explorerUrl: string
    blockExplorerUrl: string
  }
  apiInfo: {
    name: string
    listingId: number
  }
}

interface Stats {
  totalLogged: number
  uniqueBlocks: number
  firstLogged: string
  lastLogged: string
  avgResponseTime: string
}

interface ContractInfo {
  address: string
  explorerUrl: string | null
}

export default function BlockchainLogsPage() {
  const searchParams = useSearchParams()
  const accessKey = searchParams.get('accessKey')

  const [logs, setLogs] = useState<BlockchainLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [contract, setContract] = useState<ContractInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (accessKey) {
      fetchBlockchainLogs()
    }
  }, [accessKey])

  async function fetchBlockchainLogs() {
    try {
      setLoading(true)
      const response = await fetch(`/api/my-apis/blockchain-logs?accessKey=${accessKey}&limit=50`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch blockchain logs')
      }

      setLogs(data.logs)
      setStats(data.stats)
      setContract(data.contract)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
            <p className="text-muted-foreground">Loading blockchain logs...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/my-apis">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to My APIs
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8" />
            Blockchain Usage Logs
          </h1>
          <p className="text-muted-foreground">
            {logs.length > 0 ? logs[0].apiInfo.name : 'API'} - All calls logged on Sepolia testnet
          </p>
        </div>
        {contract?.explorerUrl && (
          <Button asChild>
            <a href={contract.explorerUrl} target="_blank" rel="noopener noreferrer">
              View Contract
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Logged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogged}</div>
              <p className="text-xs text-muted-foreground">API calls on-chain</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unique Blocks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueBlocks}</div>
              <p className="text-xs text-muted-foreground">Blocks used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResponseTime}ms</div>
              <p className="text-xs text-muted-foreground">Response time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                First Logged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {new Date(stats.firstLogged).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(stats.firstLogged).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Logged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {new Date(stats.lastLogged).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(stats.lastLogged).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            All API calls that have been logged on the Sepolia blockchain
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No blockchain logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Request Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            log.request.statusCode >= 200 && log.request.statusCode < 300
                              ? 'default'
                              : log.request.statusCode >= 400
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {log.request.statusCode}
                        </Badge>
                        <span className="font-mono font-semibold">{log.request.method}</span>
                        <span className="text-muted-foreground">{log.request.path}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {log.request.responseTime}ms
                        </div>
                      </div>
                    </div>

                    {/* Right: Blockchain Info */}
                    <div className="text-right space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Box className="w-4 h-4 text-blue-600" />
                        <a
                          href={log.blockchain.blockExplorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          Block #{log.blockchain.blockNumber}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      
                      <a
                        href={log.blockchain.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 justify-end font-mono"
                      >
                        {log.blockchain.txHash.substring(0, 10)}...
                        {log.blockchain.txHash.substring(log.blockchain.txHash.length - 8)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Info Footer */}
      {contract && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Usage Tracking Contract</div>
                <div className="text-xs text-muted-foreground font-mono">{contract.address}</div>
              </div>
              {contract.explorerUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={contract.explorerUrl} target="_blank" rel="noopener noreferrer">
                    View on Etherscan
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
