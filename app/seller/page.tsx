"use client"

import { Button } from "@/components/ui/button"
import { ProtectedGate } from "@/components/auth/protected"
import SellerAnalytics from "@/components/dashboards/seller-analytics"
import Link from "next/dist/client/link"
import { Plus } from "lucide-react"

export default function SellerDashboard() {
  return (
    <ProtectedGate allow={["seller"]}>
      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-16 max-w-[1600px]">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Seller Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="gap-2">
              <Link href="/sell-api"><Plus className="size-4" />List API</Link>
            </Button>
            {/* <Button variant="secondary">Withdraw</Button>
            <Button variant="outline">Transactions</Button> */}
          </div>
        </header>

        <div className="mt-6">
          <SellerAnalytics />
        </div>
      </section>
    </ProtectedGate>
  )
}
