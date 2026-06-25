import { createAdminClient, type InsForgeClient } from "@insforge/sdk"
import { createBrowserClient } from "@insforge/sdk/ssr"

// ─── Server admin client (bypasses RLS) ────────────────────────────────────
// Credentials come from the environment only — never hardcode them as defaults.
// The client is created lazily so that module import (e.g. during `next build`
// type-checking) doesn't throw when env vars aren't present; it will throw
// with a clear message on first actual use if misconfigured.
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
// Reads NEXT_PUBLIC_INSFORGE_URL / NEXT_PUBLIC_INSFORGE_ANON_KEY from the
// environment (auto-injected by InsForge deployments).
export function insforgeBrowser() {
  return createBrowserClient({
    refreshUrl: "/api/auth/refresh",
  })
}
