"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Key, 
  Copy, 
  Check, 
  ExternalLink, 
  Activity,
  AlertCircle,
  Code,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface APIAccess {
  id: number
  accessKey: string
  apiName: string
  category: string
  description: string
  baseEndpoint: string
  pricePerCall: number
  quota: {
    total: number
    used: number
    remaining: number
    usagePercentage: string
  }
  status: string
  expiresAt: string | null
  purchasedAt: string
  purchaseAmount: number
  transactionHash: string
  gatewayUrl: string
}

export default function MyAPIsPage() {
  const { dbUser } = useAuth()
  const [apis, setApis] = useState<APIAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [expandedApiId, setExpandedApiId] = useState<number | null>(null)

  useEffect(() => {
    if (dbUser?.firebase_uid) {
      fetchMyAPIs()
    }
  }, [dbUser])

  async function fetchMyAPIs() {
    try {
      setLoading(true)
      const response = await fetch(`/api/my-apis?buyerId=${dbUser?.firebase_uid}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch APIs')
      }

      setApis(data.apis)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, keyId: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyId)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active': return 'default'
      case 'expired': return 'destructive'
      case 'suspended': return 'secondary'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading your APIs...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (apis.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>My Purchased APIs</CardTitle>
            <CardDescription>You haven't purchased any APIs yet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/marketplace">Browse Marketplace</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Purchased APIs</h1>
        <p className="text-muted-foreground">
          Access keys and usage information for your purchased APIs
        </p>
      </div>

      <div className="grid gap-6">
        {apis.map((api) => (
          <Card key={api.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {api.apiName}
                    <Badge variant={getStatusColor(api.status)}>{api.status}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {api.category} • Purchased on {new Date(api.purchasedAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                  <div className="text-lg font-semibold">{api.purchaseAmount.toFixed(6)} ETH</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quota Usage */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quota Usage</span>
                  <span className="font-medium">
                    {api.quota.used.toLocaleString()} / {api.quota.total.toLocaleString()} calls
                    ({api.quota.usagePercentage}%)
                  </span>
                </div>
                <Progress value={parseFloat(api.quota.usagePercentage)} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{api.quota.remaining.toLocaleString()} calls remaining</span>
                  <span>{api.pricePerCall.toFixed(6)} ETH per call</span>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  API Access Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={api.accessKey}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(api.accessKey, api.accessKey)}
                  >
                    {copiedKey === api.accessKey ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Usage Instructions */}
              <Collapsible
                open={expandedApiId === api.id}
                onOpenChange={() => setExpandedApiId(expandedApiId === api.id ? null : api.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Usage Instructions
                    </span>
                    {expandedApiId === api.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-3">
                        <div>
                          <div className="font-semibold mb-1">Gateway Endpoint</div>
                          <code className="text-xs bg-muted p-2 rounded block">
                            POST {api.gatewayUrl}
                          </code>
                        </div>

                        <div>
                          <div className="font-semibold mb-1">Authentication</div>
                          <code className="text-xs bg-muted p-2 rounded block">
                            Header: X-BNB-API-Key: {api.accessKey}
                          </code>
                        </div>

                        <div>
                          <div className="font-semibold mb-1">Example cURL Request</div>
                          <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                            curl -X POST {api.gatewayUrl} \<br />
                            &nbsp;&nbsp;-H "X-BNB-API-Key: {api.accessKey}" \<br />
                            &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                            &nbsp;&nbsp;-d '{`{"method":"GET","path":"/your-endpoint"}`}'
                          </code>
                        </div>

                        <div>
                          <div className="font-semibold mb-1">Example JavaScript</div>
                          <code className="text-xs bg-muted p-2 rounded block overflow-x-auto whitespace-pre">
{`fetch('${api.gatewayUrl}', {
  method: 'POST',
  headers: {
    'X-BNB-API-Key': '${api.accessKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    method: 'GET',
    path: '/your-endpoint'
  })
})`}
                          </code>
                        </div>

                        <div>
                          <div className="font-semibold mb-1">Response Format</div>
                          <code className="text-xs bg-muted p-2 rounded block overflow-x-auto whitespace-pre">
{`{
  "success": true,
  "data": { /* API response data */ },
  "meta": {
    "latencyMs": 150,
    "remainingQuota": ${api.quota.remaining},
    "usedQuota": ${api.quota.used},
    "totalQuota": ${api.quota.total}
  }
}`}
                          </code>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CollapsibleContent>
              </Collapsible>

              {/* Transaction Link */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Purchase Transaction</span>
                <Button variant="link" size="sm" asChild>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${api.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    View on Etherscan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
