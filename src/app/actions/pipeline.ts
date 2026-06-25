"use server"

import { requireUser } from "@/lib/auth"
import { admin } from "@/lib/insforge"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import type { PipelineStage } from "@/lib/db/schemas"

const OSS_HOST = process.env.INSFORGE_URL

async function broadcastStatusChange(userId: string, opportunityId: string, newStage: string) {
  if (!OSS_HOST) return
  try {
    await fetch(`${OSS_HOST}/api/realtime/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INSFORGE_API_KEY}`,
      },
      body: JSON.stringify({
        channel: `opportunities:${userId}`,
        event: "status_changed",
        payload: { opportunity_id: opportunityId, status: newStage },
      }),
    })
  } catch {
    /* non-fatal: realtime is best-effort */
  }
}

// Maps a pipeline stage → opportunity status (both constrained by DB CHECKs).
const STAGE_TO_STATUS: Record<PipelineStage, string> = {
  discovered: "new",
  reviewed: "viewed",
  proposal_drafted: "proposing",
  proposal_sent: "proposed",
  in_negotiation: "negotiating",
  closed_won: "won",
  closed_lost: "lost",
}

export async function movePipelineStage(
  opportunityId: string,
  newStage: string,
  prevStage?: string
) {
  const userId = await requireUser()
  const stage = newStage as PipelineStage

  const { data: existing, error: findErr } = await admin.database
    .from("pipeline_entries")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", userId)
    .maybeSingle()

  if (findErr) return { error: findErr.message }

  const now = new Date().toISOString()

  if (existing) {
    const row = existing as { id: string }
    const { error: pipeErr } = await admin.database
      .from("pipeline_entries")
      .update({ stage, stage_changed_at: now, updated_at: now })
      .eq("id", row.id)
      .eq("user_id", userId)
    if (pipeErr) return { error: pipeErr.message }
  } else {
    const { error: pipeErr } = await admin.database.from("pipeline_entries").insert([{
      user_id: userId,
      opportunity_id: opportunityId,
      stage,
      stage_changed_at: now,
    }])
    if (pipeErr) return { error: pipeErr.message }
  }

  // Keep the opportunity status in sync with the pipeline stage.
  const newStatus = STAGE_TO_STATUS[stage] ?? "new"
  await admin.database
    .from("opportunities")
    .update({ status: newStatus, updated_at: now })
    .eq("id", opportunityId)
    .eq("user_id", userId)

  await admin.database.from("activity_log").insert([{
    user_id: userId,
    entity_type: "pipeline",
    entity_id: opportunityId,
    action: "stage_changed",
    metadata: { from: prevStage ?? null, to: newStage },
  }])

  await broadcastStatusChange(userId, opportunityId, newStage)

  revalidatePath("/pipeline")
  revalidatePath("/won-deals")
  return { error: null }
}

export async function updateDealValue(entryId: string, dealValue: number | null, currency: string) {
  const userId = await requireUser()
  const { error } = await admin.database
    .from("pipeline_entries")
    .update({ deal_value: dealValue, deal_currency: currency, updated_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("user_id", userId)

  revalidatePath("/pipeline")
  return { error: error?.message ?? null }
}

export async function updateDealDetails(
  entryId: string,
  data: {
    deal_value?: number | null
    deal_currency?: string
    close_probability?: number | null
    expected_close_date?: string | null
    lost_reason?: string | null
    notes?: string | null
    stage?: PipelineStage
  }
) {
  const userId = await requireUser()
  const payload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() }
  if (data.stage) {
    payload.stage_changed_at = new Date().toISOString()
  }
  const { error } = await admin.database
    .from("pipeline_entries")
    .update(payload)
    .eq("id", entryId)
    .eq("user_id", userId)

  // Keep opportunity status in sync if the stage changed.
  if (data.stage && !error) {
    const { data: entry } = await admin.database
      .from("pipeline_entries")
      .select("opportunity_id")
      .eq("id", entryId)
      .eq("user_id", userId)
      .maybeSingle()
    const oppId = (entry as { opportunity_id?: string } | null)?.opportunity_id
    if (oppId) {
      const newStatus = STAGE_TO_STATUS[data.stage] ?? "new"
      await admin.database
        .from("opportunities")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", oppId)
        .eq("user_id", userId)
    }
  }

  revalidatePath("/pipeline")
  revalidatePath("/won-deals")
  return { error: error?.message ?? null }
}

export async function addManualDeal(
  platformId: string | null,
  opportunityData: {
    title: string
    description: string
    post_url?: string
    budget_min?: number | null
    budget_max?: number | null
    budget_currency?: string
    budget_type?: string
  },
  stage?: PipelineStage
) {
  const userId = await requireUser()
  const { data: opp, error: oppErr } = await admin.database
    .from("opportunities")
    .insert([{
      user_id: userId,
      platform_id: platformId ?? "00000000-0000-0000-0000-000000000000",
      external_id: `manual-${randomUUID()}`,
      title: opportunityData.title,
      description: opportunityData.description,
      post_url: opportunityData.post_url ?? "",
      budget_min: opportunityData.budget_min ?? null,
      budget_max: opportunityData.budget_max ?? null,
      budget_currency: opportunityData.budget_currency ?? "USD",
      budget_type: opportunityData.budget_type ?? "unknown",
      status: "new",
    }])
    .select("id")
    .single()

  if (oppErr || !opp) return { error: oppErr?.message ?? "Failed to create opportunity" }

  const oppRow = opp as { id: string }
  const { error: pipeErr } = await admin.database.from("pipeline_entries").insert([{
    user_id: userId,
    opportunity_id: oppRow.id,
    stage: stage ?? "discovered",
    stage_changed_at: new Date().toISOString(),
  }])

  if (pipeErr) return { error: pipeErr.message }

  revalidatePath("/pipeline")
  return { error: null, id: oppRow.id }
}
