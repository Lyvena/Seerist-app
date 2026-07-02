import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerClient } from "@insforge/sdk/ssr"

export default async function RootPage() {
  const cookieStore = await cookies()
  const insforge = createServerClient({ cookies: cookieStore })

  // Validate the session (not just cookie presence) so an expired token
  // routes to /login instead of bouncing through /dashboard first.
  let authenticated = false
  try {
    const { data, error } = await insforge.auth.getCurrentUser()
    authenticated = !error && !!data?.user?.id
  } catch {
    authenticated = false
  }

  redirect(authenticated ? "/dashboard" : "/login")
}
