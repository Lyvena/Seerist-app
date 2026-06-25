"use server"

import { requireUser } from "@/lib/auth"
import { admin } from "@/lib/insforge"

interface OnboardingData {
  product: {
    name: string
    category: string
    url: string
    shortDescription: string
    detailedDescription: string
    targetCustomer: string
    keyBenefits: string[]
    pricePoint: string
    pricingModel: string
    keywords: string[]
    antiKeywords: string[]
  }
  platforms: {
    platformId: string
    enabled: boolean
    minScore: number
  }[]
  alerts: {
    digestFrequency: string
    minScoreForAlert: number
    alertEmail: string
  }
}

export async function completeOnboarding(data: OnboardingData) {
  const userId = await requireUser()
  try {
    const embeddingText = `${data.product.name}\n${data.product.detailedDescription}\n${data.product.shortDescription}\nTarget: ${data.product.targetCustomer}`

    let embedding: number[] | null = null
    try {
      const result = await admin.ai.embeddings.create({
        model: "openai/text-embedding-3-small",
        input: embeddingText,
      })
      embedding = result.data[0].embedding
    } catch (e) {
      console.warn("Embedding generation failed, continuing without it:", e)
    }

    const productResult = await admin.database
      .from("products")
      .insert({
        user_id: userId,
        name: data.product.name,
        description: data.product.detailedDescription,
        url: data.product.url || null,
        category: data.product.category,
        target_customer: data.product.targetCustomer,
        key_benefits: data.product.keyBenefits,
        pricing_model: data.product.pricingModel || null,
        price_point: data.product.pricePoint || null,
        keywords: data.product.keywords,
        anti_keywords: data.product.antiKeywords,
        embedding: embedding,
        is_active: true,
      })
      .select()

    if (productResult.error) throw new Error(`Failed to save product: ${productResult.error.message}`)
    const productId = productResult.data?.[0]?.id
    if (!productId) throw new Error("No product ID returned")

    const enabledPlatforms = data.platforms.filter((p) => p.enabled)
    if (enabledPlatforms.length > 0) {
      // Fetch existing configs so we update (not duplicate) on re-runs; the
      // (user_id, platform_id) pair is unique.
      const { data: existingConfigs } = await admin.database
        .from("user_platform_configs")
        .select("id, platform_id")
        .eq("user_id", userId)
      const existingByPlatform = new Map(
        ((existingConfigs ?? []) as Array<{ id: string; platform_id: string }>).map((c) => [c.platform_id, c.id])
      )

      for (const p of enabledPlatforms) {
        const cfg = {
          user_id: userId,
          platform_id: p.platformId,
          is_enabled: true,
          min_score: p.minScore,
          notify_email: true,
        }
        const existingId = existingByPlatform.get(p.platformId)
        if (existingId) {
          const { error } = await admin.database
            .from("user_platform_configs")
            .update(cfg)
            .eq("id", existingId)
            .eq("user_id", userId)
          if (error) throw new Error(`Failed to save platform configs: ${error.message}`)
        } else {
          const { error } = await admin.database.from("user_platform_configs").insert([cfg])
          if (error) throw new Error(`Failed to save platform configs: ${error.message}`)
        }
      }
    }

    // alert_preferences may already exist (the handle_new_user trigger creates a
    // default row on signup), so update it if present, otherwise insert.
    const { data: existingAlert } = await admin.database
      .from("alert_preferences")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    const alertPayload = {
      user_id: userId,
      digest_frequency: data.alerts.digestFrequency,
      min_score_for_alert: data.alerts.minScoreForAlert,
      platforms_included: enabledPlatforms.map((p) => p.platformId),
    }

    let alertResult
    if (existingAlert) {
      alertResult = await admin.database
        .from("alert_preferences")
        .update({ ...alertPayload, updated_at: new Date().toISOString() })
        .eq("id", (existingAlert as { id: string }).id)
        .eq("user_id", userId)
    } else {
      alertResult = await admin.database.from("alert_preferences").insert([alertPayload])
    }

    if (alertResult.error) throw new Error(`Failed to save alert preferences: ${alertResult.error.message}`)

    const profileResult = await admin.database
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId)
      .select()

    if (profileResult.error) throw new Error(`Failed to update profile: ${profileResult.error.message}`)

    return { success: true as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return { success: false as const, error: message }
  }
}
