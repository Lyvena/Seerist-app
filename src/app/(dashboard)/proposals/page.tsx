import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { ProposalsPageClient } from "./ProposalsPageClient"

interface ProposalRow {
  id: string
  content: string
  version: number
  tone: string
  word_count: number | null
  model_used: string | null
  is_ai_generated: boolean
  sent_at: string | null
  rating: number | null
  created_at: string
  opportunity_id: string
  opportunity: {
    title: string
    platform_name: string
    platform_logo_url: string | null
    budget_min: number | null
    budget_max: number | null
    budget_currency: string | null
    budget_type: string | null
  } | null
}

export default async function ProposalsPage() {
  const insforge = createServerClient({ cookies: await cookies() })

  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id

  const { data: proposalsRaw } = await insforge.database
    .from("proposals")
    .select("id, content, version, tone, word_count, model_used, is_ai_generated, sent_at, rating, created_at, opportunity_id, opportunity:opportunities!inner(title, platform_name, platform_logo_url, budget_min, budget_max, budget_currency, budget_type)")
    .eq("user_id", userId ?? "")
    .order("created_at", { ascending: false })
    .limit(50)

  const proposals = (proposalsRaw ?? []) as unknown as ProposalRow[]

  return (
    <ProposalsPageClient
      proposals={proposals}
    />
  )
}
