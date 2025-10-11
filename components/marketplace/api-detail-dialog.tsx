"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export function ApiDetailDialog({
  open,
  onOpenChange,
  api,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  api: any | null
}) {
  const [packageSize, setPackageSize] = useState<number>(1000)
  const [status, setStatus] = useState<"idle" | "initiated" | "wallet" | "pending" | "confirming" | "success">("idle")
  const [confirming, setConfirming] = useState(0)

  useEffect(() => {
    if (!open) {
      setStatus("idle")
      setConfirming(0)
    }
  }, [open])

  // Price is already in ETH from the API (converted from wei)
  const subtotal = api ? packageSize * api.pricePerCall : 0
  const platformFees = subtotal * 0.005 // 0.5% platform fee
  
  // Calculate gas estimate based on transaction type
  // Base gas for simple transfer: ~21,000 gas units
  // Smart contract interaction (our case): ~100,000-150,000 gas units
  // Average gas price: ~20 Gwei = 0.00000002 ETH
  const gasUnits = 120000 // Typical for subscription purchase smart contract call
  const gasPriceGwei = 20 // Current average gas price in Gwei
  const gasEstimateETH = (gasUnits * gasPriceGwei) / 1e9 // Convert to ETH
  
  const total = subtotal + platformFees

  function startPurchase() {
    setStatus("initiated")
    setTimeout(() => setStatus("wallet"), 500)
  }
  function approveWallet() {
    setStatus("pending")
    setTimeout(() => {
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
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    <span className="text-muted-foreground">Estimated Gas</span>
                    <span className="font-medium">{gasEstimateETH.toFixed(6)} ETH</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-lg font-bold">{total.toFixed(8)} ETH</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">+ gas fees ({gasEstimateETH.toFixed(6)} ETH) paid separately</p>
                  </div>
                </div>

                {status === "idle" && (
                  <Button onClick={startPurchase} aria-label="Start purchase" className="w-full">
                    Continue
                  </Button>
                )}
                {status === "initiated" && (
                  <div className="space-y-3">
                    <p className="text-sm text-center">Initiating transaction…</p>
                    <Progress value={20} />
                  </div>
                )}
                {status === "wallet" && (
                  <div className="space-y-3">
                    <p className="text-sm text-center font-medium">Please approve in your wallet</p>
                    <Button onClick={approveWallet} aria-label="Approve in wallet" className="w-full">
                      Simulate Approve
                    </Button>
                  </div>
                )}
                {status === "pending" && (
                  <div className="space-y-3">
                    <p className="text-sm text-center">Processing transaction…</p>
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
                        Your API quota has been added to your account
                      </p>
                    </div>
                    <Button onClick={() => onOpenChange(false)} aria-label="Close" className="w-full">
                      Close
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
