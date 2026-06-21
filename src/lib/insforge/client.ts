import { createAdminClient } from "@insforge/sdk"
import { createBrowserClient } from "@insforge/sdk/ssr"

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL ?? process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"
const API_KEY = process.env.INSFORGE_API_KEY ?? "ik_bcb691209aa697be33ceb6c9bce0f5e6"

export const insforgeAdmin = createAdminClient({
  baseUrl: BASE_URL,
  apiKey: API_KEY,
})

export function insforgeBrowser() {
  if (!process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_INSFORGE_ANON_KEY")
  }
  return createBrowserClient({
    baseUrl: BASE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    refreshUrl: "/api/auth/refresh",
  })
}