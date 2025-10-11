"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ProtectedGate } from "@/components/auth/protected"
import SellerAnalytics from "@/components/dashboards/seller-analytics"
import { Plus } from "lucide-react"

export default function SellerDashboard() {
  return (
    <ProtectedGate allow={["seller"]}>
      <section className="container mx-auto px-4 py-16">
        <header className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Seller Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your API listings and track revenue</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/seller/analytics">
                Advanced Analytics
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/seller/list-api">
                <Plus className="size-4" />
                List New API
              </Link>
            </Button>
          </div>
        </header>

        <SellerAnalytics />
      </section>
    </ProtectedGate>
  )
}
