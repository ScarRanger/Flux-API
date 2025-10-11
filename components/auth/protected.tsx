"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSession } from "./session-context"

export function ProtectedGate({
  children,
  allow,
}: { children: ReactNode; allow?: Array<"buyer" | "seller" | "node"> }) {
  const { session } = useSession()

  const allowed = !!session && (!allow || (session.role && allow.includes(session.role)))

  if (!allowed) {
    return (
      <section className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md p-6 text-center">
          <h2 className="text-xl font-semibold">Sign in required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please log in to access this dashboard. Create an account or continue with Google.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/signup">Create Account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/marketplace">Go to Marketplace</Link>
            </Button>
          </div>
        </Card>
      </section>
    )
  }

  return <>{children}</>
}
