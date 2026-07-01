import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { OpportunityPageClient } from "./OpportunityPageClient"

interface OpportunityRaw {
  id: string
  title: string
  description: string
  poster_name: string | null
  poster_company: string | null
  post_url: string
  budget_min: number | null
  budget_max: number | null
  budget_currency: string | null
  budget_type: string | null
  required_skills: string[] | null
  platform_id: string
  ai_score: number | null
  ai_score_breakdown: Record<string, number> | null
  status: string | null
  is_starred: boolean | null
  posted_at: string | null
  platforms: { slug: string; name: string; logo_url: string | null } | null
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OpportunitiesPage({ searchParams }: Props) {
  const insforge = createServerClient({ cookies: await cookies() })
  const params = await searchParams

  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id

  const platformFilter = typeof params.platforms === "string" ? params.platforms : ""
  const scoreMin = parseInt(typeof params.score_min === "string" ? params.score_min : "60", 10) || 0
  const scoreMax = parseInt(typeof params.score_max === "string" ? params.score_max : "100", 10) || 100
  const budgetMin = typeof params.budget_min === "string" ? params.budget_min : ""
  const budgetMax = typeof params.budget_max === "string" ? params.budget_max : ""
  const budgetType = typeof params.budget_type === "string" ? params.budget_type : ""
  const statusFilter = typeof params.status === "string" ? params.status : ""
  const dateRange = typeof params.date === "string" ? params.date : ""
  const starredOnly = typeof params.starred === "string" ? params.starred : ""
  const sortBy = typeof params.sort === "string" ? params.sort : "score"
  const page = Math.max(1, parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1)
  const PAGE_SIZE = 20

  let query = insforge.database
    .from("opportunities")
    .select("id, title, description, poster_name, poster_company, post_url, budget_min, budget_max, budget_currency, budget_type, required_skills, platform_id, ai_score, ai_score_breakdown, status, is_starred, posted_at, platforms!inner(slug, name, logo_url)", { count: "exact" })

  if (userId) {
    query = query.eq("user_id", userId)
  }

  if (platformFilter) {
    const slugs = platformFilter.split(",")
    query = query.in("platforms.slug", slugs)
  }

  if (scoreMin > 0 || scoreMax < 100) {
    query = query.gte("ai_score", scoreMin).lte("ai_score", scoreMax)
  }

  if (budgetMin) {
    query = query.gte("budget_max", parseFloat(budgetMin))
  }
  if (budgetMax) {
    query = query.lte("budget_min", parseFloat(budgetMax))
  }
  if (budgetType) {
    query = query.eq("budget_type", budgetType)
  }

  if (statusFilter) {
    const statuses = statusFilter.split(",")
    query = query.in("status", statuses)
  }

  if (dateRange === "today") {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    query = query.gte("posted_at", today.toISOString())
  } else if (dateRange === "7d") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    query = query.gte("posted_at", weekAgo.toISOString())
  } else if (dateRange === "30d") {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    query = query.gte("posted_at", monthAgo.toISOString())
  }

  if (starredOnly === "true") {
    query = query.eq("is_starred", true)
  }

  const sortMapping: Record<string, string> = {
    score: "ai_score",
    posted_at: "posted_at",
    budget_max: "budget_max",
  }
  const sortCol = sortMapping[sortBy] ?? "ai_score"
  query = query.order(sortCol, { ascending: sortBy === "budget_max" ? false : false })
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const raw = await query
  const opportunities = ((raw.data ?? []) as Array<Record<string, unknown>>).map((opp: Record<string, unknown>) => {
    const platformArr = opp.platforms as Array<{ slug: string; name: string; logo_url: string | null }> | undefined
    const platform = platformArr?.[0] ?? null
    return {
      ...opp,
      platforms: platform,
    } as OpportunityRaw
  })

  const { data: platformsData } = await insforge.database
    .from("platforms")
    .select("id, slug, name")
    .eq("is_supported", true)
    .order("name")

  const platforms = platformsData ?? []
  const lastSyncAt = new Date().toISOString()

  const { data: productsData } = await insforge.database
    .from("products")
    .select("id")
    .eq("user_id", userId ?? "")
    .limit(1)

  const productId = (productsData as Array<{ id: string }> | null)?.[0]?.id ?? ""

  return (
    <OpportunityPageClient
      initialOpportunities={opportunities}
      totalCount={raw.count ?? 0}
      platforms={platforms}
      userId={userId ?? ""}
      lastSyncAt={lastSyncAt}
      productId={productId}
      currentPage={page}
      pageSize={PAGE_SIZE}
    />
  )
}
