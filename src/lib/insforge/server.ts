import { createServerClient } from "@insforge/sdk/ssr"

export async function getServerClient() {
  const { cookies } = await import("next/headers")
  return createServerClient({ cookies: await cookies() })
}
