"use client"

import useSWR from "swr"
import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ApiFilters } from "@/components/marketplace/filters"
import { ApiCard } from "@/components/marketplace/api-card"
import { ApiDetailDialog } from "@/components/marketplace/api-detail-dialog"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function MarketplacePage() {
  const { data } = useSWR<{ listings: any[] }>("/api/marketplace", fetcher)
  const [q, setQ] = useState("")
  const [active, setActive] = useState<any | null>(null)
  const [filters, setFilters] = useState({ category: "All", location: "All", maxPrice: 0 })

  const listings = data?.listings ?? []

  const filtered = useMemo(() => {
    return listings
      .filter((l) => (filters.category === "All" ? true : l.category === filters.category))
      .filter((l) => (filters.location === "All" ? true : l.location === filters.location))
      .filter((l) => (filters.maxPrice > 0 ? l.pricePerCall <= filters.maxPrice : true))
      .filter((l) => (q ? `${l.name} ${l.category}`.toLowerCase().includes(q.toLowerCase()) : true))
  }, [listings, filters, q])

  return (
    <section className="container mx-auto grid gap-6 px-4 py-8 sm:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
        <ApiFilters value={filters} onChange={setFilters} />
        <Card className="p-4">
          <h3 className="text-sm font-medium">Tips</h3>
          <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Use filters to find the best price and latency.</li>
            <li>Check seller reputation and terms before purchase.</li>
          </ul>
        </Card>
      </aside>

      <div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search APIs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search APIs"
            className="max-w-md"
          />
          <Badge variant="secondary">{filtered.length} results</Badge>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <ApiCard key={l.id} api={l} onOpen={() => setActive(l)} />
          ))}
        </div>
      </div>

      <ApiDetailDialog open={!!active} api={active} onOpenChange={(o) => !o && setActive(null)} />
    </section>
  )
}
