"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { WalletWidget } from "@/components/shared/wallet-widget"

export function Hero() {
  return (
    <section className="border-b bg-secondary/40">
      <div className="container mx-auto grid gap-6 px-4 py-12 md:grid-cols-2 md:py-20">
        <div className="flex flex-col justify-center">
          <h1 className="text-pretty text-4xl font-bold leading-tight sm:text-5xl">Monetize Your Unused API Calls</h1>
          <p className="mt-4 text-pretty text-muted-foreground">
            Tokenize surplus API quota, route securely via our proxy network, and settle on-chain with transparent,
            auditable payments.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/marketplace">Browse APIs</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/login">Start Selling (Login)</Link>
            </Button>
            <WalletWidget />
          </div>

          <div className="mt-6 flex gap-3 text-xs text-muted-foreground">
            <span>Audited smart contracts</span>
            <span aria-hidden>•</span>
            <span>Encrypted proxy routing</span>
            <span aria-hidden>•</span>
            <span>Non-custodial settlement</span>
          </div>
        </div>

        <Card className="p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { k: "24h Volume", v: "$128,400" },
              { k: "Active Listings", v: "1,842" },
              { k: "Calls Routed", v: "12.3M" },
              { k: "Avg Savings", v: "36%" },
              { k: "Active Nodes", v: "412" },
              { k: "Uptime", v: "99.99%" },
            ].map((s) => (
              <div key={s.k} className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">{s.k}</div>
                <div className="mt-1 text-lg font-semibold">{s.v}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Live metrics are updated continuously from the network.</p>
        </Card>
      </div>
    </section>
  )
}
