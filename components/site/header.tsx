"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WalletWidget } from "@/components/shared/wallet-widget"
import { NotificationsCenter } from "@/components/shared/notifications-center"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSession } from "@/components/auth/session-context"

export function Header() {
  const [q, setQ] = useState("")
  const { session, logout } = useSession()
  const role = session?.role

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Home">
          <div className="size-7 rounded-md bg-primary" />
          <span className="font-semibold">ProxyMarket</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-2 md:flex" aria-label="Primary">
          {/* removed Buy/Sell from public nav */}
          <Link className="rounded-md px-3 py-2 text-sm hover:bg-secondary" href="/marketplace">
            Marketplace
          </Link>
          <Link className="rounded-md px-3 py-2 text-sm hover:bg-secondary" href="/node">
            Operate
          </Link>
          {role === "buyer" && (
            <Link className="rounded-md px-3 py-2 text-sm hover:bg-secondary" href="/buyer">
              My Buyer Dashboard
            </Link>
          )}
          {role === "seller" && (
            <Link className="rounded-md px-3 py-2 text-sm hover:bg-secondary" href="/seller">
              My Seller Dashboard
            </Link>
          )}
        </nav>

        <form
          onSubmit={(e) => e.preventDefault()}
          role="search"
          className="ml-auto hidden items-center gap-2 md:flex"
          aria-label="Search APIs"
        >
          <div className="relative">
            <Input
              placeholder="Search APIs ( / )"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-[340px]"
              aria-label="Search APIs"
            />
          </div>
          <Button type="button" variant="secondary">
            Search
          </Button>
        </form>

        <div className="ml-2 flex items-center gap-2">
          <ThemeToggle />
          <NotificationsCenter />
          <WalletWidget />
          {!role ? (
            <>
              <Button asChild className="hidden md:inline-flex bg-transparent" variant="outline">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="hidden md:inline-flex">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={logout} aria-label="Logout">
                Logout
              </Button>
            </>
          )}
          <Button asChild className="hidden md:inline-flex">
            <Link href="/marketplace">Marketplace</Link>
          </Button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className={cn("fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 border-t bg-background/95 px-2 py-2 md:hidden")}
        aria-label="Mobile"
      >
        <Link className="rounded-md px-3 py-2 text-center text-sm hover:bg-secondary" href="/marketplace">
          Market
        </Link>
        <Link className="rounded-md px-3 py-2 text-center text-sm hover:bg-secondary" href="/node">
          Operate
        </Link>
        {!role ? (
          <Link className="rounded-md px-3 py-2 text-center text-sm hover:bg-secondary" href="/login">
            Login
          </Link>
        ) : role === "buyer" ? (
          <Link className="rounded-md px-3 py-2 text-center text-sm hover:bg-secondary" href="/buyer">
            Buyer
          </Link>
        ) : (
          <Link className="rounded-md px-3 py-2 text-center text-sm hover:bg-secondary" href="/seller">
            Seller
          </Link>
        )}
      </nav>
    </header>
  )
}
