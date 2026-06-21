import { createServerClient } from "@insforge/sdk/ssr"

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL ?? process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"

export async function getServerClient() {
  const { cookies } = await import("next/headers")
  return createServerClient({ cookies: await cookies() })
}