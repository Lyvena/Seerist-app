"use server"

import { requireUser } from "@/lib/auth"
import { admin } from "@/lib/insforge"
import { revalidatePath } from "next/cache"
import { canAddProduct, safePlan } from "@/lib/plan-limits"

const insforge = admin

// Generate an embedding vector via the InsForge Model Gateway (OpenRouter).
// Returns null on failure so product save never blocks on AI availability.
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const result = await admin.ai.embeddings.create({
      model: "openai/text-embedding-3-small",
      input: text.slice(0, 8000),
    })
    return result.data?.[0]?.embedding ?? null
  } catch (e) {
    console.warn("Embedding generation failed, continuing without it:", e)
    return null
  }
}

export async function upsertProduct(
  data: {
    id?: string
    name: string
    description: string
    url?: string
    category?: string
    target_customer?: string
    key_benefits?: string[]
    pricing_model?: string
    price_point?: string
    keywords?: string[]
    anti_keywords?: string[]
  }
) {
  const userId = await requireUser()
  const { data: profile } = await insforge.database
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle()
  const plan = safePlan((profile as { plan: string | null } | null)?.plan)

  if (!data.id) {
    const { data: existing } = await insforge.database
      .from("products")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
    const count = (existing ?? []).length
    const access = canAddProduct(plan, count)
    if (!access.allowed) {
      return { error: access.reason ?? "Product limit reached." }
    }
  }

  const embedText = `${data.name}\n${data.description}\n${data.target_customer ?? ""}\n${(data.keywords ?? []).join(", ")}`
  const embedding = await generateEmbedding(embedText)

  const payload = {
    user_id: userId,
    name: data.name,
    description: data.description,
    url: data.url || null,
    category: data.category ?? null,
    target_customer: data.target_customer ?? null,
    key_benefits: data.key_benefits ?? [],
    pricing_model: data.pricing_model ?? null,
    price_point: data.price_point ?? null,
    keywords: data.keywords ?? [],
    anti_keywords: data.anti_keywords ?? [],
    embedding,
    is_active: true,
  }

  if (data.id) {
    const { error } = await insforge.database
      .from("products")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId)
    revalidatePath("/products")
    revalidatePath("/dashboard")
    return { error: error?.message ?? null }
  }

  const { error } = await insforge.database.from("products").insert([payload])
  revalidatePath("/products")
  revalidatePath("/dashboard")
  return { error: error?.message ?? null }
}

export async function deleteProduct(productId: string) {
  const userId = await requireUser()
  const { error } = await insforge.database
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("user_id", userId)
  revalidatePath("/products")
  revalidatePath("/dashboard")
  return { error: error?.message ?? null }
}

export async function getProductCount() {
  const userId = await requireUser()
  const { data } = await insforge.database
    .from("products")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
  return (data ?? []).length
}
