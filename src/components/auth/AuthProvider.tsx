"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { signOutAction } from "@/app/actions/auth"
import type { Profile } from "@/lib/db/schemas"

interface User {
  id: string
  email: string
  emailVerified: boolean
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function initAuth() {
      try {
        const { insforgeBrowser } = await import("@/lib/insforge/client")
        const client = insforgeBrowser()
        const { data, error } = await client.auth.getCurrentUser()
        if (cancelled) return

        const u = data?.user
        if (!error && u) {
          setUser({
            id: u.id,
            email: u.email ?? "",
            // InsForge user schema uses camelCase `emailVerified`.
            emailVerified: Boolean(u.emailVerified),
          })
        }
      } catch {
        // No session / refresh failed — user is logged out.
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    initAuth()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setProfile(null)
      return
    }
    let cancelled = false

    async function fetchProfile() {
      try {
        const { insforgeBrowser } = await import("@/lib/insforge/client")
        const client = insforgeBrowser()
        const { data } = await client.database
          .from("profiles")
          .select("*")
          .eq("id", user!.id)
          .maybeSingle()
        if (!cancelled) setProfile(data as Profile | null)
      } catch {
        if (!cancelled) setProfile(null)
      }
    }
    fetchProfile()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  async function signOut() {
    try {
      await signOutAction()
    } catch {
      // Even if the server sign-out fails, clear local state.
    }
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
