"use server"

import { requireUser } from "@/lib/auth"
import { admin } from "@/lib/insforge"
import { revalidatePath } from "next/cache"

/**
 * AI preference management.
 *
 * Seerist does NOT support Bring Your Own Key (BYOK). All AI features
 * (opportunity scoring, proposal generation, embeddings) run through the
 * InsForge Model Gateway using the project's OPENROUTER_API_KEY. Users can
 * only choose between the built-in models and tune generation defaults —
 * they never provide their own credentials.
 */

const ALLOWED_MODELS = new Set([
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-4-turbo",
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-haiku-4-5",
  "google/gemini-2.5-pro",
  "google/gemini-2.0-flash",
  "meta-llama/llama-3.3-70b-instruct",
])

const ALLOWED_TONES = new Set(["professional", "casual", "enthusiastic", "concise"])
const ALLOWED_PENALTIES = new Set(["none", "light", "strict"])

export async function updateAIPreferences(
  prefs: {
    ai_model: string
    ai_tone: string
    ai_max_proposal_words: number
    ai_include_pricing: boolean
    ai_include_product_url: boolean
    ai_prioritize_relevance: boolean
    ai_keyword_penalty: string
    ai_boost_repeat_posters: boolean
  }
) {
  const userId = await requireUser()

  // Allow-list validation (never trust client shapes).
  if (!ALLOWED_MODELS.has(prefs.ai_model)) return { error: "Invalid model" }
  if (!ALLOWED_TONES.has(prefs.ai_tone)) return { error: "Invalid tone" }
  if (!ALLOWED_PENALTIES.has(prefs.ai_keyword_penalty)) return { error: "Invalid penalty setting" }
  const maxWords = Math.min(Math.max(Math.floor(prefs.ai_max_proposal_words), 100), 400)

  const { error } = await admin.database
    .from("profiles")
    .update({
      ai_model: prefs.ai_model,
      ai_tone: prefs.ai_tone,
      ai_max_proposal_words: maxWords,
      ai_include_pricing: Boolean(prefs.ai_include_pricing),
      ai_include_product_url: Boolean(prefs.ai_include_product_url),
      ai_prioritize_relevance: Boolean(prefs.ai_prioritize_relevance),
      ai_keyword_penalty: prefs.ai_keyword_penalty,
      ai_boost_repeat_posters: Boolean(prefs.ai_boost_repeat_posters),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) return { error: error.message }
  revalidatePath("/settings/ai")
  return { success: true }
}
