"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ProtectedGate } from "@/components/auth/protected"
import BuyerOverview from "@/components/dashboards/buyer-overview"

export default function BuyerDashboard() {
  return (
    <ProtectedGate allow={["buyer"]}>
      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-16 max-w-[1600px]">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Buyer Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/marketplace">Browse APIs</Link>
            </Button>
            <Button variant="secondary">Add Funds</Button>
          </div>
        </header>

        <BuyerOverview />
      </section>
    </ProtectedGate>
  )
}
