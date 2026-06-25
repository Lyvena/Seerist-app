import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

// Polled by the live feed to discover new opportunities + active platforms.
export async function GET(req: NextRequest) {
  try {
    const insforge = createServerClient({ cookies: await cookies() })
    const { data: userData } = await insforge.auth.getCurrentUser()
    const userId = userData?.user?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sinceParam = req.nextUrl.searchParams.get("since")
    let since: string
    if (sinceParam) {
      const parsed = new Date(sinceParam)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid 'since' date" }, { status: 400 })
      }
      since = parsed.toISOString()
    } else {
      since = new Date(Date.now() - 60_000).toISOString()
    }

    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()

    const [oppsRes, platformsRes, todayRes, proposalsRes] = await Promise.all([
      insforge.database
        .from("opportunities")
        .select(
          "id, external_id, title, description, poster_name, poster_company, post_url, budget_min, budget_max, budget_currency, budget_type, platform_id, ai_score, ai_score_breakdown, required_skills, status, is_starred, posted_at, created_at, platforms!inner(slug, name, logo_url)"
        )
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100),

      insforge.database
        .from("user_platform_configs")
        .select("platform_id, platform:platforms!inner(slug, name, logo_url)")
        .eq("user_id", userId)
        .eq("is_enabled", true),

      insforge.database
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfToday),

      insforge.database
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfToday),
    ])

    const activePlatforms = ((platformsRes.data ?? []) as Array<Record<string, unknown>>).map(
      (p: Record<string, unknown>) => {
        const platformArr = p.platform as Array<{ slug: string; name: string; logo_url: string | null }> | undefined
        const platform = platformArr?.[0] ?? { slug: "", name: "Unknown", logo_url: null }
        return {
          platform_id: p.platform_id as string,
          platform,
        }
      }
    )

    const opps = (oppsRes.data ?? []) as Array<Record<string, unknown>>
    const enriched = opps.map((opp) => {
      const pArr = opp.platforms as Array<{ slug: string; name: string; logo_url: string | null }> | null
      const p = pArr?.[0] ?? null
      return {
        ...opp,
        platform_slug: p?.slug ?? "",
        platform_name: p?.name ?? "Unknown",
        platform_logo_url: p?.logo_url ?? null,
      }
    })

    return NextResponse.json({
      opportunities: enriched,
      platforms: activePlatforms,
      todayCount: todayRes.count ?? 0,
      proposalsToday: proposalsRes.count ?? 0,
    })
  } catch (err) {
    console.error("live-feed/poll error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
