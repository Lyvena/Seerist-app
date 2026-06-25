"use server"

import { requireUser } from "@/lib/auth"
import { admin } from "@/lib/insforge"
import { revalidatePath } from "next/cache"

export async function togglePlatform(platformId: string, isEnabled: boolean) {
  const userId = await requireUser()
  const { data: existing, error: findErr } = await admin.database
    .from("user_platform_configs")
    .select("id")
    .eq("user_id", userId)
    .eq("platform_id", platformId)
    .maybeSingle()

  if (findErr) return { error: findErr.message }

  let error: { message: string } | null = null
  if (existing) {
    const row = existing as { id: string }
    ;({ error } = await admin.database
      .from("user_platform_configs")
      .update({ is_enabled: isEnabled })
      .eq("id", row.id)
      .eq("user_id", userId))
  } else {
    ;({ error } = await admin.database
      .from("user_platform_configs")
      .insert([{ user_id: userId, platform_id: platformId, is_enabled: isEnabled }]))
  }

  revalidatePath("/platforms")
  return { error: error?.message ?? null }
}

export async function updatePlatformConfig(
  platformId: string,
  data: {
    min_score?: number
    auto_propose?: boolean
    notify_email?: boolean
    custom_keywords?: string[]
    is_enabled?: boolean
  }
) {
  const userId = await requireUser()
  const { data: existing, error: findErr } = await admin.database
    .from("user_platform_configs")
    .select("id")
    .eq("user_id", userId)
    .eq("platform_id", platformId)
    .maybeSingle()

  if (findErr) return { error: findErr.message }

  let error: { message: string } | null = null
  if (existing) {
    const row = existing as { id: string }
    ;({ error } = await admin.database
      .from("user_platform_configs")
      .update(data)
      .eq("id", row.id)
      .eq("user_id", userId))
  } else {
    ;({ error } = await admin.database
      .from("user_platform_configs")
      .insert([{ user_id: userId, platform_id: platformId, is_enabled: true, ...data }]))
  }

  revalidatePath("/platforms")
  return { error: error?.message ?? null }
}

export async function triggerPlatformScan(platformSlug: string) {
  const userId = await requireUser()
  const ossHost = process.env.INSFORGE_URL
  if (!ossHost) return { ok: false, error: "INSFORGE_URL is not configured" }
  const url = `${ossHost}/functions/monitor-orchestrator`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INSFORGE_API_KEY}`,
      },
      body: JSON.stringify({ user_id: userId, platform_slug: platformSlug }),
    })

    return { ok: res.ok, data: await res.json().catch(() => ({})) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Scan failed" }
  }
}
