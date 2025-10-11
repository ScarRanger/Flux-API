"use client"

import type React from "react"
import { useSession } from "@/components/auth/session-context"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  type Role = "buyer" | "seller"
  const [role, setRole] = useState<Role>("buyer")
  const { login } = useSession()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await new Promise((r) => setTimeout(r, 900))
      if (mode === "signup") {
        login({ role })
        window.location.href = role === "seller" ? "/seller" : "/buyer"
      } else {
        window.location.href = "/buyer"
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function google() {
    setLoading(true)
    setTimeout(() => {
      if (mode === "signup") {
        login({ role })
        window.location.href = role === "seller" ? "/seller" : "/buyer"
      } else {
        window.location.href = "/buyer"
      }
    }, 900)
  }

  return (
    <Card className="p-6 w-full max-w-sm mx-auto">
      <h1 className="text-balance text-2xl font-semibold tracking-tight">
        {mode === "login" ? "Sign in" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "login" ? "Welcome back" : "Join the decentralized marketplace"}
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <div>
          <label className="text-sm text-muted-foreground">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Email" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Password</label>
          <Input
            type="password"
            value={password}
            minLength={6}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label="Password"
          />
        </div>
        {mode === "signup" ? (
          <fieldset className="mt-2">
            <legend className="mb-2 text-sm font-medium">Account type</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-muted">
                <input
                  type="radio"
                  name="role"
                  value="buyer"
                  checked={role === "buyer"}
                  onChange={() => setRole("buyer")}
                  aria-label="Buyer account"
                />
                <span className="text-sm">Buyer</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-muted">
                <input
                  type="radio"
                  name="role"
                  value="seller"
                  checked={role === "seller"}
                  onChange={() => setRole("seller")}
                  aria-label="Seller account"
                />
                <span className="text-sm">Seller</span>
              </label>
            </div>
          </fieldset>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
        <Button type="button" variant="secondary" onClick={google} disabled={loading} className="w-full">
          Continue with Google
        </Button>
      </form>

      <div className="mt-4 text-sm text-muted-foreground">
        {mode === "login" ? (
          <span>
            New here?{" "}
            <Link href="/signup" className="underline">
              Create an account
            </Link>
          </span>
        ) : (
          <span>
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </span>
        )}
      </div>
    </Card>
  )
}
