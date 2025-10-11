"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ProtectedGate } from "@/components/auth/protected"
import BuyerOverview from "@/components/dashboards/buyer-overview"

export default function BuyerDashboard() {
  return (
    <ProtectedGate allow={["buyer"]}>
      <section className="container mx-auto px-4 py-8 sm:py-10">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Buyer Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/marketplace">Browse APIs</Link>
            </Button>
            <Button variant="secondary">Add Funds</Button>
          </div>
        </header>

        {/* Render advanced analytics with charts and pie instead of simple tabs */}
        <div className="mt-6">
          <BuyerOverview />
        </div>
      </section>
    </ProtectedGate>
  )
}
