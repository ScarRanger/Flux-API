"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WalletWidget } from "@/components/shared/wallet-widget"
import { NotificationsCenter } from "@/components/shared/notifications-center"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSession } from "@/components/auth/session-context"
import { useEffect, useState } from "react"

export function Header() {
  const { session, logout } = useSession()
  const role = session?.role
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Home">
            <div className="size-8 rounded-md bg-primary" />
            <span className="font-bold text-xl">FluxAPI</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            <Link className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent transition-colors" href="/marketplace">
              Marketplace
            </Link>
            <Link className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent transition-colors" href="/node">
              Operate
            </Link>
            {mounted && role === "buyer" && (
              <Link className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent transition-colors" href="/buyer">
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <NotificationsCenter />
            <WalletWidget />
          </div>
          {mounted && !role ? (
            <>
              <Button asChild className="hidden lg:inline-flex" variant="ghost" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="hidden lg:inline-flex" size="sm">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          ) : mounted && role ? (
            <Button size="sm" variant="ghost" onClick={logout} aria-label="Logout" className="hidden lg:inline-flex">
              Logout
            </Button>
          ) : null}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className={cn("fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 gap-2 border-t bg-background p-3 lg:hidden")}
        aria-label="Mobile"
      >
        <Link className="rounded-lg px-3 py-2 text-center text-sm font-medium hover:bg-accent transition-colors" href="/marketplace">
          Market
        </Link>
        <Link className="rounded-lg px-3 py-2 text-center text-sm font-medium hover:bg-accent transition-colors" href="/node">
          Operate
        </Link>
        {mounted && !role ? (
          <Link className="rounded-lg px-3 py-2 text-center text-sm font-medium hover:bg-accent transition-colors" href="/login">
            Login
          </Link>
        ) : mounted && role === "buyer" ? (
          <Link className="rounded-lg px-3 py-2 text-center text-sm font-medium hover:bg-accent transition-colors" href="/buyer">
            Dashboard
          </Link>
        ) : (
          <div />
        )}
      </nav>
    </header>
  )
}
