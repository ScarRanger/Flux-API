"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function ApiCard({ api, onOpen }: { api: any; onOpen: () => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div aria-hidden className="size-10 rounded bg-primary/15" />
        <div>
          <h3 className="font-medium">{api.name}</h3>
          <p className="text-xs text-muted-foreground">
            {api.category} • {api.location}
          </p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-sm">Price per call</div>
          <div className="text-lg font-semibold">{api.pricePerCall.toFixed(6)} ETH</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{api.discount}% off</Badge>
        <span>Quota: {api.quotaAvailable.toLocaleString()}</span>
        <span>Rating: {api.sellerRating}</span>
        <span>Latency: {api.latencyMs}ms</span>
        <span>Rep: {api.reputation}</span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Button variant="secondary" onClick={onOpen} aria-label={`View ${api.name}`}>
          View
        </Button>
        <Button onClick={onOpen} aria-label={`Purchase ${api.name}`}>
          Purchase
        </Button>
      </div>
    </Card>
  )
}
