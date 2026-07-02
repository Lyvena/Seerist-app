import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { PipelineKanban, type PipelineCardData } from "@/components/pipeline/PipelineKanban"

interface PipelineEntryRaw {
  id: string
  opportunity_id: string
  stage: string
  stage_changed_at: string | null
  deal_value: number | null
  deal_currency: string | null
  close_probability: number | null
  expected_close_date: string | null
  notes: string | null
  created_at: string
  opportunities: {
    id: string
    title: string
    description: string
    poster_name: string | null
    poster_company: string | null
    post_url: string
    ai_score: number | null
    budget_min: number | null
    budget_max: number | null
    budget_currency: string | null
    budget_type: string | null
    status: string | null
    required_skills: string[] | null
    posted_at: string | null
    // joined from platforms (via platform_id)
    platforms: { name: string; logo_url: string | null } | null
  } | null
}

export default async function PipelinePage() {
  const insforge = createServerClient({ cookies: await cookies() })

  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id

  const { data: entriesRaw } = await insforge.database
    .from("pipeline_entries")
    .select("id, opportunity_id, stage, stage_changed_at, deal_value, deal_currency, close_probability, expected_close_date, notes, created_at, opportunities!inner(id, title, description, poster_name, poster_company, post_url, ai_score, budget_min, budget_max, budget_currency, budget_type, status, required_skills, posted_at, platforms(slug, name, logo_url))")
    .eq("user_id", userId ?? "")
    .order("stage_changed_at", { ascending: false })
    .limit(100)

  const raw = entriesRaw as unknown as PipelineEntryRaw[] | null

  const entries: PipelineCardData[] = (raw ?? []).map((r) => {
    // PostgREST nests a one-to-many join as an array; take the first (the
    // opportunity's single platform). Fall back gracefully if absent.
    const platformArr = r.opportunities?.platforms as unknown as
      | Array<{ name: string; logo_url: string | null }>
      | { name: string; logo_url: string | null }
      | null
    const platform = Array.isArray(platformArr) ? platformArr[0] : platformArr

    return {
      entry: {
        id: r.id,
        opportunity_id: r.opportunity_id,
        stage: r.stage,
        stage_changed_at: r.stage_changed_at,
        deal_value: r.deal_value,
        deal_currency: r.deal_currency,
        close_probability: r.close_probability,
        expected_close_date: r.expected_close_date,
        notes: r.notes,
        created_at: r.created_at,
      },
      opportunity: {
        id: r.opportunities?.id ?? "",
        title: r.opportunities?.title ?? "",
        description: r.opportunities?.description ?? "",
        poster_name: r.opportunities?.poster_name ?? null,
        poster_company: r.opportunities?.poster_company ?? null,
        post_url: r.opportunities?.post_url ?? "",
        ai_score: r.opportunities?.ai_score ?? null,
        budget_min: r.opportunities?.budget_min ?? null,
        budget_max: r.opportunities?.budget_max ?? null,
        budget_currency: r.opportunities?.budget_currency ?? null,
        budget_type: r.opportunities?.budget_type ?? null,
        status: r.opportunities?.status ?? null,
        required_skills: r.opportunities?.required_skills ?? null,
        posted_at: r.opportunities?.posted_at ?? null,
        platform_name: platform?.name ?? "Unknown",
        platform_logo_url: platform?.logo_url ?? null,
      },
    }
  })

  return (
    <PipelineKanban entries={entries} />
  )
}
