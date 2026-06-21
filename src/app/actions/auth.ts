"use server"

import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"

export async function signInWithEmail(email: string, password: string) {
  const insforge = createServerClient({ cookies: await cookies() })
  return insforge.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email: string, password: string) {
  const insforge = createServerClient({ cookies: await cookies() })
  return insforge.auth.signUp({ email, password })
}

export async function signOutAction() {
  const insforge = createServerClient({ cookies: await cookies() })
  return insforge.auth.signOut()
}

export async function signInWithOAuth(provider: string, redirectTo: string) {
  const insforge = createServerClient({ cookies: await cookies() })
  return insforge.auth.signInWithOAuth(provider as any, { redirectTo })
}