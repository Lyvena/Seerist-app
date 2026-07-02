import { createAdminClient } from "@insforge/sdk"

function getConfig() {
  const baseUrl = process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL
  const apiKey = process.env.INSFORGE_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Missing InsForge admin config. Set INSFORGE_URL and INSFORGE_API_KEY environment variables."
    )
  }
  return { baseUrl, apiKey }
}

// Lazily-created admin client (bypasses RLS). Never hardcode the key — it must
// come from the environment so it can be rotated without a code change.
let _admin: ReturnType<typeof createAdminClient> | null = null
export const admin = new Proxy({} as ReturnType<typeof createAdminClient>, {
  get(_target, prop) {
    if (!_admin) _admin = createAdminClient(getConfig())
    return Reflect.get(_admin, prop)
  },
})
