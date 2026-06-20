import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function requireUser(): Promise<string> {
  const insforge = createServerClient({ cookies: await cookies() })
  const { data, error } = await insforge.auth.getCurrentUser()
  if (error || !data?.user?.id) {
    redirect("/login")
  }
  return data.user.id
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
