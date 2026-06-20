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
        model: "openai/text-embedding-ada-002",
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
      const platformConfigs = enabledPlatforms.map((p) => ({
        user_id: userId,
        platform_id: p.platformId,
        is_enabled: true,
        min_score: p.minScore,
        notify_email: true,
      }))

      const platformResult = await admin.database
        .from("user_platform_configs")
        .insert(platformConfigs)
        .select()

      if (platformResult.error) throw new Error(`Failed to save platform configs: ${platformResult.error.message}`)
    }

    const alertResult = await admin.database
      .from("alert_preferences")
      .insert({
        user_id: userId,
        digest_frequency: data.alerts.digestFrequency,
        min_score_for_alert: data.alerts.minScoreForAlert,
        platforms_included: enabledPlatforms.map((p) => p.platformId),
      })
      .select()

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
