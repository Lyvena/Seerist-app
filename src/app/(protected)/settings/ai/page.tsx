import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AISettingsClient from "./AISettingsClient"
import { effectivePlan, isOwnerEmail } from "@/lib/plan-limits"

export default async function AISettingsPage() {
  const insforge = createServerClient({ cookies: await cookies() })
  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id ?? ""
  const email = userData?.user?.email ?? ""
  if (!userId) redirect("/login")

  const { data: profile } = await insforge.database
    .from("profiles")
    .select("plan, ai_model, ai_tone, ai_max_proposal_words, ai_include_pricing, ai_include_product_url, ai_prioritize_relevance, ai_keyword_penalty, ai_boost_repeat_posters")
    .eq("id", userId)
    .maybeSingle()

  const p = (profile ?? {}) as Record<string, unknown>
  // Owners are always treated as the top tier regardless of stored plan.
  const plan = effectivePlan((p.plan as string) ?? "free", email)

  const prefs = {
    model: (p.ai_model as string) ?? "openai/gpt-4o-mini",
    tone: (p.ai_tone as string) ?? "professional",
    maxWords: (p.ai_max_proposal_words as number) ?? 250,
    includePricing: (p.ai_include_pricing as boolean) ?? false,
    includeProductUrl: (p.ai_include_product_url as boolean) ?? false,
    prioritizeRelevance: (p.ai_prioritize_relevance as boolean) ?? true,
    keywordPenalty: (p.ai_keyword_penalty as string) ?? "light",
    boostRepeatPosters: (p.ai_boost_repeat_posters as boolean) ?? false,
  }

  return <AISettingsClient plan={plan} initialPrefs={prefs} />
}
