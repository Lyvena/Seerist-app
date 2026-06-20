"use server"

import { createAdminClient } from "@insforge/sdk"
import OpenAI from "openai"
import { revalidatePath } from "next/cache"

const insforge = createAdminClient({
  baseUrl: process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app",
  apiKey: process.env.INSFORGE_API_KEY ?? "ik_bcb691209aa697be33ceb6c9bce0f5e6",
})

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
})

function generateEmbedding(text: string) {
  return openai.embeddings.create({
    model: "openai/text-embedding-3-small",
    input: text.slice(0, 8000),
  })
}

export async function upsertProduct(
  userId: string,
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
  if (!data.id) {
    const { data: existing } = await insforge.database.from("products").select("id").eq("user_id", userId).eq("is_active", true)
    const count = (existing ?? []).length
    if (count >= 1) {
      return { error: new Error("Free plan allows only 1 product. Upgrade to Pro.") }
    }
  }

  const embedText = `${data.name}\n${data.description}\n${data.target_customer ?? ""}\n${(data.keywords ?? []).join(", ")}`
  const embedResp = await generateEmbedding(embedText)
  const embedding = embedResp.data?.[0]?.embedding ?? null

  const payload = {
    user_id: userId,
    name: data.name,
    description: data.description,
    url: data.url ?? null,
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
    const { error } = await insforge.database.from("products").update(payload).eq("id", data.id)
    revalidatePath("/app/products")
    return { error }
  }

  const { error } = await insforge.database.from("products").insert([payload])
  revalidatePath("/app/products")
  return { error }
}

export async function deleteProduct(productId: string) {
  const { error } = await insforge.database.from("products").update({ is_active: false }).eq("id", productId)
  revalidatePath("/app/products")
  return { error }
}

export async function getProductCount(userId: string) {
  const { data } = await insforge.database.from("products").select("id").eq("user_id", userId).eq("is_active", true)
  return (data ?? []).length
}
