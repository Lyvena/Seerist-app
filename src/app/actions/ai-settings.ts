"use server"

import { requireUser } from "@/lib/auth"
import { admin } from "@/lib/insforge"
import { revalidatePath } from "next/cache"

function getBaseUrl() {
  return process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"
}

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY

export async function testAIKey(key: string): Promise<{ valid: boolean; model?: string; error?: string }> {
  const userId = await requireUser()
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://seerist.xyz",
        "X-Title": "Seerist",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Respond with only the word: ok" }],
        max_tokens: 5,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { valid: false, error: errText.slice(0, 200) }
    }

    const data = await res.json()
    return { valid: true, model: data?.model ?? "unknown" }
  } catch (err) {
    return { valid: false, error: (err as Error).message }
  }
}

export async function saveAIKey(key: string) {
  const userId = await requireUser()
  if (!key?.trim()) return { error: "Key is required" }

  const test = await testAIKey(key)
  if (!test.valid) {
    return { error: test.error ?? "Invalid API key" }
  }

  const { error } = await admin.database
    .from("profiles")
    .update({
      ai_api_key: key,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) return { error: error.message }
  revalidatePath("/settings/ai")
  return { success: true }
}

export async function removeAIKey() {
  const userId = await requireUser()
  const { error } = await admin.database
    .from("profiles")
    .update({
      ai_api_key: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) return { error: error.message }
  revalidatePath("/settings/ai")
  return { success: true }
}

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
  const { error } = await admin.database
    .from("profiles")
    .update({
      ...prefs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) return { error: error.message }
  revalidatePath("/settings/ai")
  return { success: true }
}
