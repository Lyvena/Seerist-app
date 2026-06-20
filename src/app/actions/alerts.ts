"use server"

import { requireUser } from "@/lib/auth"
import { createAdminClient } from "@insforge/sdk"
import { revalidatePath } from "next/cache"

const insforge = createAdminClient({
  baseUrl: process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app",
  apiKey: process.env.INSFORGE_API_KEY ?? "ik_bcb691209aa697be33ceb6c9bce0f5e6",
})

export async function saveAlertPreferences(
  data: {
    digest_frequency: string
    min_score_for_alert: number
    platforms_included: string[]
  }
) {
  const userId = await requireUser()
  const { data: existing } = await insforge.database.from("alert_preferences")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) {
    const row = existing as { id: string }
    const { error } = await insforge.database.from("alert_preferences").update(data).eq("id", row.id)
    revalidatePath("/settings/alerts")
    return { error }
  } else {
    const { error } = await insforge.database.from("alert_preferences").insert([{ user_id: userId, ...data }])
    revalidatePath("/settings/alerts")
    return { error }
  }
}

export async function sendTestAlert(email: string) {
  const userId = await requireUser()
  const { error } = await insforge.database.from("activity_log").insert([{
    user_id: userId,
    entity_type: "alert",
    entity_id: userId,
    action: "test_email_sent",
    metadata: { email },
  }])
  return { error }
}
