"use client"

import { Button } from "@/components/ui/button"
import { ProtectedGate } from "@/components/auth/protected"
import SellerAnalytics from "@/components/dashboards/seller-analytics"

export default function SellerDashboard() {
  return (
    <ProtectedGate allow={["seller"]}>
      <section className="container mx-auto px-4 py-8 sm:py-10">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Seller Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button>List API</Button>
            <Button variant="secondary">Withdraw</Button>
            <Button variant="outline">Transactions</Button>
          </div>
        </header>

        <div className="mt-6">
          <SellerAnalytics />
        </div>
      </section>
    </ProtectedGate>
  )
}
