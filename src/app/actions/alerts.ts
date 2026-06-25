"use server"

import { requireUser } from "@/lib/auth"
import { admin } from "@/lib/insforge"
import { revalidatePath } from "next/cache"
import type { DIGEST_FREQUENCIES } from "@/lib/db/schemas"

export async function saveAlertPreferences(
  data: {
    digest_frequency: (typeof DIGEST_FREQUENCIES)[number]
    min_score_for_alert: number
    platforms_included: string[]
  }
) {
  const userId = await requireUser()
  const { data: existing, error: findErr } = await admin.database
    .from("alert_preferences")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  if (findErr) return { error: findErr.message }

  let error: { message: string } | null = null
  if (existing) {
    const row = existing as { id: string }
    ;({ error } = await admin.database
      .from("alert_preferences")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("user_id", userId))
  } else {
    ;({ error } = await admin.database
      .from("alert_preferences")
      .insert([{ user_id: userId, ...data }]))
  }

  revalidatePath("/settings/alerts")
  return { error: error?.message ?? null }
}

export async function sendTestAlert(email: string) {
  const userId = await requireUser()
  // entity_type must be one of: opportunity, proposal, pipeline (DB CHECK)
  const { error } = await admin.database.from("activity_log").insert([{
    user_id: userId,
    entity_type: "opportunity",
    entity_id: userId,
    action: "test_email_sent",
    metadata: { email },
  }])
  return { error: error?.message ?? null }
}
