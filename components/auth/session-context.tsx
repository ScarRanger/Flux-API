"use client"

import type React from "react"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

type Role = "buyer" | "seller" | "node"
type Session = { address?: string; role?: Role } | null

type SessionContextValue = {
  session: Session
  login: (s: Session) => void
  logout: () => void
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null)

  useEffect(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem("session") : null
    if (raw) {
      try {
        setSession(JSON.parse(raw))
      } catch {}
    }
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      login: (s) => {
        setSession(s)
        try {
          window.localStorage.setItem("session", JSON.stringify(s))
        } catch {}
      },
      logout: () => {
        setSession(null)
        try {
          window.localStorage.removeItem("session")
        } catch {}
      },
    }),
    [session],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider")
  }
  return ctx
}
