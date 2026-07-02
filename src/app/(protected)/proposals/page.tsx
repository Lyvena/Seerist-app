import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { ProposalsPageClient } from "./ProposalsPageClient"

interface RawProposalRow {
  id: string
  content: string
  version: number
  tone_used: string
  word_count: number | null
  model_used: string | null
  is_ai_generated: boolean
  sent_at: string | null
  rating: number | null
  created_at: string
  opportunity_id: string
  opportunity: {
    title: string
    budget_min: number | null
    budget_max: number | null
    budget_currency: string | null
    budget_type: string | null
    // joined from platforms (one-to-many → array)
    platforms: Array<{ name: string; logo_url: string | null }> | null
  } | null
}

export default async function ProposalsPage() {
  const insforge = createServerClient({ cookies: await cookies() })

  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id

  const { data: proposalsRaw } = await insforge.database
    .from("proposals")
    .select("id, content, version, tone_used, word_count, model_used, is_ai_generated, sent_at, rating, created_at, opportunity_id, opportunity:opportunities!inner(title, budget_min, budget_max, budget_currency, budget_type, platforms(slug, name, logo_url))")
    .eq("user_id", userId ?? "")
    .order("created_at", { ascending: false })
    .limit(50)

  // Flatten the nested platform join into the shape the client expects.
  const raw = (proposalsRaw ?? []) as unknown as RawProposalRow[]
  const proposals = raw.map((p) => {
    const platform = p.opportunity?.platforms?.[0] ?? null
    return {
      id: p.id,
      content: p.content,
      version: p.version,
      tone_used: p.tone_used,
      word_count: p.word_count,
      model_used: p.model_used,
      is_ai_generated: p.is_ai_generated,
      sent_at: p.sent_at,
      rating: p.rating,
      created_at: p.created_at,
      opportunity_id: p.opportunity_id,
      opportunity: p.opportunity
        ? {
            title: p.opportunity.title,
            platform_name: platform?.name ?? "Unknown",
            platform_logo_url: platform?.logo_url ?? null,
            budget_min: p.opportunity.budget_min,
            budget_max: p.opportunity.budget_max,
            budget_currency: p.opportunity.budget_currency,
            budget_type: p.opportunity.budget_type,
          }
        : null,
    }
  })

  return (
    <ProposalsPageClient
      proposals={proposals}
    />
  )
}
