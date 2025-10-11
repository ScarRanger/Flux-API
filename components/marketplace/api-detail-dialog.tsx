"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
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
  const [packageSize, setPackageSize] = useState<number>(10000)
  const [token, setToken] = useState("USDC")
  const [status, setStatus] = useState<"idle" | "initiated" | "wallet" | "pending" | "confirming" | "success">("idle")
  const [confirming, setConfirming] = useState(0)

  useEffect(() => {
    if (!open) {
      setStatus("idle")
      setConfirming(0)
    }
  }, [open])

  const cost = api ? packageSize * api.pricePerCall : 0
  const fees = cost * 0.005
  const gasEstimate = 0.21 // demo

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
      <DialogContent aria-describedby={undefined} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{api?.name}</DialogTitle>
        </DialogHeader>

        {!api ? null : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Tabs defaultValue="overview">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="seller">Seller</TabsTrigger>
                  <TabsTrigger value="terms">Terms</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-3">
                  <p className="text-sm text-muted-foreground">{api.description}</p>
                  <div className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">Rate limit: {api.rateLimit}</Badge>
                      <Badge variant="secondary">Latency: {api.latencyMs}ms</Badge>
                      <Badge variant="secondary">Reputation: {api.reputation}</Badge>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mt-2">Endpoints</h4>
                    <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      {api.endpoints.map((e: string) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-2">
                  <p className="text-sm">Per-call: ${api.pricePerCall.toFixed(4)}</p>
                  <p className="text-sm">Discount: {api.discount}% volume pricing</p>
                </TabsContent>

                <TabsContent value="seller" className="space-y-2">
                  <p className="text-sm">Seller: {api.seller.name}</p>
                  <p className="text-sm">Sales: {api.seller.sales.toLocaleString()}</p>
                  <p className="text-sm">Rating: {api.sellerRating}</p>
                </TabsContent>

                <TabsContent value="terms" className="space-y-2">
                  <p className="text-sm">Refunds: {api.terms.refund}</p>
                  <p className="text-sm">SLA: {api.terms.sla}</p>
                  <p className="text-sm">Restrictions: {api.terms.restrictions}</p>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-3" role="region" aria-label="Purchase">
              <h3 className="font-medium">Purchase</h3>
              <div className="grid gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Package size (calls)</label>
                  <Input
                    type="number"
                    min={100}
                    step={100}
                    value={packageSize}
                    onChange={(e) => setPackageSize(Number(e.target.value))}
                    aria-label="Package size"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Payment token</label>
                  <Select value={token} onValueChange={setToken}>
                    <SelectTrigger aria-label="Payment token">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>${cost.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fees</span>
                    <span>${fees.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimated Gas</span>
                    <span>
                      {gasEstimate} {token === "ETH" ? "ETH" : "USD eq."}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between font-medium">
                    <span>Total</span>
                    <span>${(cost + fees).toFixed(4)}</span>
                  </div>
                </div>

                {status === "idle" && (
                  <Button onClick={startPurchase} aria-label="Start purchase">
                    Continue
                  </Button>
                )}
                {status === "initiated" && (
                  <div className="space-y-2">
                    <p className="text-sm">Initiating transaction…</p>
                    <Progress value={20} />
                  </div>
                )}
                {status === "wallet" && (
                  <div className="space-y-2">
                    <p className="text-sm">Please approve in your wallet.</p>
                    <Button onClick={approveWallet} aria-label="Approve in wallet">
                      Simulate Approve
                    </Button>
                  </div>
                )}
                {status === "pending" && (
                  <div className="space-y-2">
                    <p className="text-sm">Pending…</p>
                    <Progress value={40} />
                  </div>
                )}
                {status === "confirming" && (
                  <div className="space-y-2">
                    <p className="text-sm">Confirming ({confirming}/12)…</p>
                    <Progress value={(confirming / 12) * 100} />
                  </div>
                )}
                {status === "success" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Success! Your purchase is complete.</p>
                    <Button onClick={() => onOpenChange(false)} aria-label="Close">
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
