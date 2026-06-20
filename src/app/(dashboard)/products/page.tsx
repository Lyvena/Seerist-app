import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { ProductsClient } from "@/components/products/ProductsClient"

interface ProductRow {
  id: string
  name: string
  description: string
  url: string | null
  category: string | null
  target_customer: string | null
  key_benefits: string[]
  pricing_model: string | null
  price_point: string | null
  keywords: string[]
  anti_keywords: string[]
  is_active: boolean
  created_at: string
}

export default async function ProductsPage() {
  const insforge = createServerClient({ cookies: await cookies() })

  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id

  const { data: profileData } = await insforge.database
    .from("profiles")
    .select("plan")
    .eq("id", userId ?? "")
    .single()

  const plan = ((profileData ?? {}) as Record<string, unknown>)?.plan as string ?? "free"

  const { data: productsRaw } = await insforge.database
    .from("products")
    .select("id, name, description, url, category, target_customer, key_benefits, pricing_model, price_point, keywords, anti_keywords, is_active, created_at")
    .eq("user_id", userId ?? "")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  const products = (productsRaw ?? []) as ProductRow[]

  const { data: oppCounts } = await insforge.database
    .from("opportunities")
    .select("product_id")
    .eq("user_id", userId ?? "")

  const countMap: Record<string, number> = {}
  for (const opp of (oppCounts ?? []) as Array<{ product_id: string }>) {
    if (opp.product_id) countMap[opp.product_id] = (countMap[opp.product_id] ?? 0) + 1
  }

  return (
    <ProductsClient
      products={products}
      opportunityCounts={countMap}
      plan={plan}
      userId={userId ?? ""}
    />
  )
}
