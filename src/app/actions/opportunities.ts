"use server"

import { requireUser } from "@/lib/auth"
import { admin } from "@/lib/insforge"
import type { OpportunityStatus } from "@/lib/db/schemas"

export async function updateOpportunityStatus(id: string, status: OpportunityStatus) {
  const userId = await requireUser()
  const { error } = await admin.database
    .from("opportunities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
  return { error: error?.message ?? null }
}

export async function toggleStar(id: string, currentlyStarred: boolean) {
  const userId = await requireUser()
  const { error } = await admin.database
    .from("opportunities")
    .update({ is_starred: !currentlyStarred, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
  return { error: error?.message ?? null }
}

export async function skipOpportunity(id: string) {
  const userId = await requireUser()
  const now = new Date().toISOString()

  const { error: updateError } = await admin.database
    .from("opportunities")
    .update({ status: "skipped", updated_at: now })
    .eq("id", id)
    .eq("user_id", userId)

  if (updateError) return { error: updateError.message }

  const { error: logError } = await admin.database.from("activity_log").insert([{
    user_id: userId,
    entity_type: "opportunity",
    entity_id: id,
    action: "skipped",
    metadata: { skipped_at: now },
  }])

  return { error: logError?.message ?? null }
}

export async function markViewed(id: string) {
  const userId = await requireUser()
  const { error } = await admin.database
    .from("opportunities")
    .update({ status: "viewed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("status", "new")

  return { error: error?.message ?? null }
}
