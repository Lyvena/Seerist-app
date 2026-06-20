"use server"

import { createAdminClient } from "@insforge/sdk"
import { revalidatePath } from "next/cache"

const insforge = createAdminClient({
  baseUrl: process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app",
  apiKey: process.env.INSFORGE_API_KEY ?? "ik_bcb691209aa697be33ceb6c9bce0f5e6",
})

export async function saveAlertPreferences(
  userId: string,
  data: {
    digest_frequency: string
    min_score_for_alert: number
    platforms_included: string[]
  }
) {
  const { data: existing } = await insforge.database.from("alert_preferences")
    .select("id")
    .eq("user_id", userId)
    .single()

  const payload = { user_id: userId, ...data }

  if (existing) {
    const row = existing as { id: string }
    const { error } = await insforge.database.from("alert_preferences").update(data).eq("id", row.id)
    revalidatePath("/app/settings/alerts")
    return { error }
  } else {
    const { error } = await insforge.database.from("alert_preferences").insert([payload])
    revalidatePath("/app/settings/alerts")
    return { error }
  }
}

export async function sendTestAlert(userId: string, email: string) {
  const { error } = await insforge.database.from("activity_log").insert([{
    user_id: userId,
    entity_type: "alert",
    entity_id: userId,
    action: "test_email_sent",
    metadata: { email },
  }])
  return { error }
}
