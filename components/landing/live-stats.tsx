"use client"

import useSWR from "swr"
import { Card } from "@/components/ui/card"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function LiveStats() {
  const { data } = useSWR("/api/stats", fetcher, { refreshInterval: 5000 })
  const s = data?.stats

  const items = [
    { label: "Volume (24h)", value: s?.volume24h ?? "—" },
    { label: "Listings", value: s?.listings ?? "—" },
    { label: "Calls Routed", value: s?.callsRouted ?? "—" },
    { label: "Savings", value: s ? `${s.savingsPct}%` : "—" },
    { label: "Active Nodes", value: s?.activeNodes ?? "—" },
    { label: "Uptime", value: s ? `${s.uptime}%` : "—" },
  ]

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <Card key={i.label} className="p-6">
          <p className="text-sm text-muted-foreground">{i.label}</p>
          <p className="mt-1 text-2xl font-semibold" aria-live="polite">
            {i.value}
          </p>
        </Card>
      ))}
    </div>
  )
}
