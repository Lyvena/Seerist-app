"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { signOutAction } from "@/app/actions/auth"
import type { Profile } from "@/lib/db/schemas"

interface User {
  id: string
  email: string
  emailConfirmed?: boolean
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
    async function initAuth() {
      const { insforgeBrowser } = await import("@/lib/insforge/client")
      const client = insforgeBrowser()
      
      client.auth.getCurrentUser().then(({ data }) => {
        const userData = data?.user as { id: string; email?: string; email_confirmed_at?: string } | undefined
        if (userData) {
          setUser({
            id: userData.id,
            email: userData.email ?? "",
            emailConfirmed: userData.email_confirmed_at != null,
          })
        }
        setLoading(false)
      })
    }
    initAuth()
  }, [])

  useEffect(() => {
    if (!user?.id) return
    async function fetchProfile() {
      const { insforgeBrowser } = await import("@/lib/insforge/client")
      const client = insforgeBrowser()
      
      if (!user) return
      const uid = user.id
      client.database
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle()
        .then(({ data }) => setProfile(data as Profile | null))
    }
    fetchProfile()
  }, [user])

  async function signOut() {
    await signOutAction()
    setUser(null)
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