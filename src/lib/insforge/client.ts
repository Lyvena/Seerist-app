import { createAdminClient, type InsForgeClient } from "@insforge/sdk"
import { createBrowserClient } from "@insforge/sdk/ssr"

// ─── Server admin client (bypasses RLS) ────────────────────────────────────
function getConfig() {
  const baseUrl = process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL
  const apiKey = process.env.INSFORGE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Missing InsForge server config. Set INSFORGE_URL and INSFORGE_API_KEY environment variables."
    )
  }
  return { baseUrl, apiKey }
}

let _admin: InsForgeClient | null = null
export const insforgeAdmin = new Proxy({} as InsForgeClient, {
  get(_target, prop) {
    if (!_admin) _admin = createAdminClient(getConfig())
    return Reflect.get(_admin, prop)
  },
})

// ─── Browser client (user-authenticated, respects RLS) ─────────────────────
export function insforgeBrowser() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  if (!baseUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_INSFORGE_URL or NEXT_PUBLIC_INSFORGE_ANON_KEY"
    )
  }
  return createBrowserClient({
    baseUrl,
    anonKey,
    refreshUrl: "/api/auth/refresh",
  })
}
