"use server"

import { createAdminClient } from "@insforge/sdk"
import { revalidatePath } from "next/cache"

const insforge = createAdminClient({
  baseUrl: process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app",
  apiKey: process.env.INSFORGE_API_KEY ?? "ik_bcb691209aa697be33ceb6c9bce0f5e6",
})

export async function movePipelineStage(
  opportunityId: string,
  newStage: string,
  userId: string,
  prevStage?: string
) {
  const { error: pipeErr } = await insforge.database.from("pipeline_entries").insert([{
    user_id: userId,
    opportunity_id: opportunityId,
    stage: newStage,
    stage_changed_at: new Date().toISOString(),
  }])

  if (pipeErr) return { error: pipeErr }

  const statusMap: Record<string, string> = {
    discovered: "new",
    reviewed: "viewed",
    proposal_drafted: "proposing",
    proposal_sent: "proposed",
    in_negotiation: "negotiating",
    closed_won: "won",
    closed_lost: "lost",
  }

  const newStatus = statusMap[newStage] ?? "new"
  await insforge.database.from("opportunities").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", opportunityId)

  await insforge.database.from("activity_log").insert([{
    user_id: userId,
    entity_type: "pipeline",
    entity_id: opportunityId,
    action: "stage_changed",
    metadata: { from: prevStage ?? null, to: newStage },
  }])

  revalidatePath("/app/pipeline")
  return { error: null }
}

export async function updateDealValue(
  entryId: string,
  dealValue: number | null,
  currency: string
) {
  const { error } = await insforge.database.from("pipeline_entries").update({
    deal_value: dealValue,
    deal_currency: currency,
  }).eq("id", entryId)

  revalidatePath("/app/pipeline")
  return { error }
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
    stage?: string
  }
) {
  const { error } = await insforge.database.from("pipeline_entries").update({
    ...data,
    stage_changed_at: data.stage ? new Date().toISOString() : undefined,
  }).eq("id", entryId)

  revalidatePath("/app/pipeline")
  return { error }
}

export async function addManualDeal(
  userId: string,
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
  stage?: string
) {
  const { data: opp, error: oppErr } = await insforge.database.from("opportunities").insert([{
    user_id: userId,
    platform_id: platformId ?? "00000000-0000-0000-0000-000000000000",
    title: opportunityData.title,
    description: opportunityData.description,
    post_url: opportunityData.post_url ?? "",
    budget_min: opportunityData.budget_min ?? null,
    budget_max: opportunityData.budget_max ?? null,
    budget_currency: opportunityData.budget_currency ?? "USD",
    budget_type: opportunityData.budget_type ?? null,
    status: "new",
  }]).select("id").single()

  if (oppErr || !opp) return { error: oppErr }

  const oppRow = opp as { id: string }
  await insforge.database.from("pipeline_entries").insert([{
    user_id: userId,
    opportunity_id: oppRow.id,
    stage: stage ?? "discovered",
    stage_changed_at: new Date().toISOString(),
  }])

  revalidatePath("/app/pipeline")
  return { error: null, id: oppRow.id }
}
