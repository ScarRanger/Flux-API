"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function ApiDetailDialog({
  open,
  onOpenChange,
  api,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  api: any | null
}) {
  const { dbUser } = useAuth()
  const [packageSize, setPackageSize] = useState<number>(1000)
  const [status, setStatus] = useState<"idle" | "checking" | "initiated" | "processing" | "confirming" | "success" | "error">("idle")
  const [confirming, setConfirming] = useState(0)
  const [error, setError] = useState<string>("")
  const [walletBalance, setWalletBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!open) {
      setStatus("idle")
      setConfirming(0)
      setError("")
    }
  }, [open])

  // Fetch wallet balance when dialog opens
  useEffect(() => {
    async function fetchBalance() {
      if (open && dbUser?.wallet_address) {
        try {
          const response = await fetch(
            `/api/wallet/balance?address=${dbUser.wallet_address}&network=sepolia`
          )
          const data = await response.json()
          if (data.success && data.data) {
            setWalletBalance(parseFloat(data.data.formattedBalance))
          }
        } catch (err) {
          console.error('Failed to fetch wallet balance:', err)
        }
      }
    }
    fetchBalance()
  }, [open, dbUser])

  // Price is already in ETH from the API (converted from wei)
  const subtotal = api ? packageSize * api.pricePerCall : 0
  const platformFees = subtotal * 0.005 // 0.5% platform fee
  
  // Calculate gas estimate based on Sepolia testnet conditions
  // Standard ETH transfer uses 21,000 gas units
  // From Etherscan: Gas Price was ~0.00000001 Gwei (extremely low on testnet)
  const gasUnits = 21000 // Standard ETH transfer
  const gasPriceGwei = 0.00000005 // Very low gas price on Sepolia (~0.00000001 Gwei typical)
  const gasEstimateETH = (gasUnits * gasPriceGwei) / 1e9 // Convert to ETH
  // Example: 21,000 * 0.00000005 / 1,000,000,000 = 0.00000000000105 ETH
  
  const total = subtotal + platformFees

  async function startPurchase() {
    if (!dbUser) {
      setError("Please log in to make a purchase")
      return
    }

    // Check if wallet has sufficient balance
    if (walletBalance !== null && walletBalance < total) {
      setError(`Insufficient balance. You have ${walletBalance.toFixed(6)} ETH but need ${total.toFixed(6)} ETH`)
      setStatus("error")
      return
    }

    setError("")
    setStatus("checking")
    
    try {
      // Call purchase API
      setStatus("processing")
      const response = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerId: dbUser.firebase_uid,
          listingId: api.id,
          packageSize: packageSize,
          totalAmount: total
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Purchase failed')
      }

      // Simulate blockchain confirmation
      setStatus("confirming")
      let i = 0
      const t = setInterval(() => {
        i += 1
        setConfirming(i)
        if (i >= 12) {
          clearInterval(t)
          setStatus("success")
        }
      }, 300)

    } catch (err: any) {
      console.error('Purchase error:', err)
      setError(err.message || 'Failed to complete purchase')
      setStatus("error")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="!max-w-[1000px] w-full max-h-[150vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{api?.name}</DialogTitle>
        </DialogHeader>

        {!api ? null : (
          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            <div>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="seller">Seller</TabsTrigger>
                  <TabsTrigger value="terms">Terms</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{api.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Performance</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">Rate limit: {api.rateLimit}</Badge>
                      <Badge variant="secondary" className="text-xs">Latency: {api.latencyMs}ms</Badge>
                      <Badge variant="secondary" className="text-xs">Reputation: {api.reputation}</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Available Endpoints</h4>
                    <div className="space-y-2">
                      {api.endpoints.map((e: string) => (
                        <div key={e} className="text-xs font-mono bg-muted px-3 py-2 rounded-md break-all">
                          {e}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Price per call:</span>
                      <span className="text-sm font-semibold">${api.pricePerCall.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Volume discount:</span>
                      <span className="text-sm font-semibold text-green-600">{api.discount}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Quota available:</span>
                      <span className="text-sm font-semibold">{api.quotaAvailable.toLocaleString()} calls</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="seller" className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Seller:</span>
                      <span className="text-sm font-semibold">{api.seller.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total sales:</span>
                      <span className="text-sm font-semibold">{api.seller.sales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Rating:</span>
                      <span className="text-sm font-semibold">{api.sellerRating} ⭐</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Wallet:</span>
                      <span className="text-xs font-mono">{api.seller.wallet?.substring(0, 10)}...{api.seller.wallet?.substring(api.seller.wallet.length - 8)}</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="terms" className="space-y-3 mt-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Refund Policy</h4>
                      <p className="text-sm text-muted-foreground">{api.terms.refund}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Service Level Agreement</h4>
                      <p className="text-sm text-muted-foreground">{api.terms.sla}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Usage Restrictions</h4>
                      <p className="text-sm text-muted-foreground">{api.terms.restrictions}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-4 lg:border-l lg:pl-6" role="region" aria-label="Purchase">
              <h3 className="font-semibold text-lg">Purchase Package</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Package size (calls)</label>
                  <Input
                    type="number"
                    min={100}
                    step={100}
                    value={packageSize}
                    onChange={(e) => setPackageSize(Number(e.target.value))}
                    aria-label="Package size"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum: 100 calls
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
                  <div className="text-xs text-muted-foreground mb-2">
                    {packageSize.toLocaleString()} calls × {api?.pricePerCall.toFixed(8)} ETH
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{subtotal.toFixed(8)} ETH</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Platform fees (0.5%)</span>
                    <span className="font-medium">{platformFees.toFixed(8)} ETH</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Gas (testnet)</span>
                    <span className="font-medium">~{gasEstimateETH.toExponential(3)} ETH</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total (excl. gas)</span>
                      <span className="text-lg font-bold">{total.toFixed(8)} ETH</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gas fees (~{gasEstimateETH.toExponential(2)} ETH) negligible on testnet
                    </p>
                  </div>
                </div>

                {walletBalance !== null && (
                  <div className="text-xs text-muted-foreground text-center">
                    Wallet Balance: {walletBalance.toFixed(6)} ETH
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {status === "idle" && (
                  <Button 
                    onClick={startPurchase} 
                    aria-label="Start purchase" 
                    className="w-full"
                    disabled={!dbUser}
                  >
                    {dbUser ? 'Purchase Now' : 'Please log in'}
                  </Button>
                )}
                {status === "checking" && (
                  <div className="space-y-3">
                    <p className="text-sm text-center">Checking wallet balance…</p>
                    <Progress value={10} />
                  </div>
                )}
                {status === "processing" && (
                  <div className="space-y-3">
                    <p className="text-sm text-center">Processing purchase…</p>
                    <Progress value={40} />
                  </div>
                )}
                {status === "confirming" && (
                  <div className="space-y-3">
                    <p className="text-sm text-center">Confirming on blockchain ({confirming}/12 blocks)…</p>
                    <Progress value={(confirming / 12) * 100} />
                  </div>
                )}
                {status === "success" && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-center">
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        ✓ Purchase Successful!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your API quota of {packageSize.toLocaleString()} calls has been added to your account
                      </p>
                    </div>
                    <Button onClick={() => onOpenChange(false)} aria-label="Close" className="w-full">
                      Close
                    </Button>
                  </div>
                )}
                {status === "error" && (
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setStatus("idle")} 
                      aria-label="Try again" 
                      variant="outline"
                      className="w-full"
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
