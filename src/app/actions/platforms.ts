"use server"

import { createAdminClient } from "@insforge/sdk"
import { revalidatePath } from "next/cache"

const insforge = createAdminClient({
  baseUrl: process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app",
  apiKey: process.env.INSFORGE_API_KEY ?? "ik_bcb691209aa697be33ceb6c9bce0f5e6",
})

export async function togglePlatform(
  userId: string,
  platformId: string,
  isEnabled: boolean
) {
  const { data: existing } = await insforge.database.from("user_platform_configs")
    .select("id")
    .eq("user_id", userId)
    .eq("platform_id", platformId)
    .single()

  if (existing) {
    const row = existing as { id: string }
    await insforge.database.from("user_platform_configs")
      .update({ is_enabled: isEnabled })
      .eq("id", row.id)
  } else {
    await insforge.database.from("user_platform_configs")
      .insert([{ user_id: userId, platform_id: platformId, is_enabled: isEnabled }])
  }

  revalidatePath("/app/platforms")
}

export async function updatePlatformConfig(
  userId: string,
  platformId: string,
  data: {
    min_score?: number
    auto_propose?: boolean
    notify_email?: boolean
    custom_keywords?: string[]
  }
) {
  const { data: existing } = await insforge.database.from("user_platform_configs")
    .select("id")
    .eq("user_id", userId)
    .eq("platform_id", platformId)
    .single()

  if (existing) {
    const row = existing as { id: string }
    await insforge.database.from("user_platform_configs")
      .update(data)
      .eq("id", row.id)
  } else {
    await insforge.database.from("user_platform_configs")
      .insert([{ user_id: userId, platform_id: platformId, is_enabled: false, ...data }])
  }

  revalidatePath("/app/platforms")
}

export async function triggerPlatformScan(userId: string, platformSlug: string) {
  const ossHost = process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"
  const url = `${ossHost}/functions/monitor-orchestrator`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.INSFORGE_API_KEY}` },
    body: JSON.stringify({ user_id: userId, platform_slug: platformSlug }),
  })

  return { ok: res.ok, data: await res.json().catch(() => ({})) }
}
