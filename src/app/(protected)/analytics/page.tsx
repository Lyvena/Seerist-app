import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import AnalyticsClient from "./AnalyticsClient"

function getDateRange(range: string): { start: Date; end: Date; prevStart: Date } {
  const now = new Date()
  const end = now

  let start: Date
  if (range === "7d") start = new Date(now.getTime() - 7 * 86400000)
  else if (range === "30d") start = new Date(now.getTime() - 30 * 86400000)
  else if (range === "90d") start = new Date(now.getTime() - 90 * 86400000)
  else start = new Date(now.getTime() - 7 * 86400000)

  const diff = end.getTime() - start.getTime()
  const prevStart = new Date(start.getTime() - diff)

  return { start, end, prevStart }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const insforge = createServerClient({ cookies: await cookies() })
  const params = await searchParams
  const range = (typeof params.range === "string" ? params.range : "7d")
  const { start, end, prevStart } = getDateRange(range)

  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id ?? ""

  const { data: profileData } = await insforge.database
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single()

  const plan = ((profileData ?? {}) as Record<string, unknown>)?.plan as string ?? "free"
  const isPro = plan === "pro" || plan === "agency"

  const startStr = start.toISOString()
  const prevStartStr = prevStart.toISOString()

  const [{ data: oppsRaw }, { data: prevOppsRaw }, { data: proposalsRaw }, { data: prevProposalsRaw }] = await Promise.all([
    insforge.database
      .from("opportunities")
      .select("id, ai_score, ai_score_breakdown, platform_id, status, created_at, budget_min, budget_max, title, required_skills, post_url, poster_name, poster_company")
      .eq("user_id", userId)
      .gte("created_at", startStr),
    insforge.database
      .from("opportunities")
      .select("id, ai_score, status, created_at")
      .eq("user_id", userId)
      .gte("created_at", prevStartStr)
      .lt("created_at", startStr),
    insforge.database
      .from("proposals")
      .select("id, opportunity_id, tone, rating, sent_at, response_received_at, outcome, created_at, word_count")
      .eq("user_id", userId)
      .gte("created_at", startStr),
    insforge.database
      .from("proposals")
      .select("id, sent_at, response_received_at, outcome, created_at")
      .eq("user_id", userId)
      .gte("created_at", prevStartStr)
      .lt("created_at", startStr),
  ])

  const opportunities = (oppsRaw ?? []) as Array<Record<string, unknown>>
  const prevOpportunities = (prevOppsRaw ?? []) as Array<Record<string, unknown>>
  const proposals = (proposalsRaw ?? []) as Array<Record<string, unknown>>
  const prevProposals = (prevProposalsRaw ?? []) as Array<Record<string, unknown>>

  const { data: platformsData } = await insforge.database
    .from("platforms")
    .select("id, name, slug, logo_url")

  const platforms = (platformsData ?? []) as Array<{ id: string; name: string; slug: string; logo_url: string | null }>
  const platformMap = new Map(platforms.map((p) => [p.id, p]))

  const oppsThisPeriod = opportunities.length
  const oppsPrevPeriod = prevOpportunities.length
  const oppChange = oppsPrevPeriod > 0 ? Math.round(((oppsThisPeriod - oppsPrevPeriod) / oppsPrevPeriod) * 100) : 0

  const propsThisPeriod = proposals.length
  const propsPrevPeriod = prevProposals.length
  const propChange = propsPrevPeriod > 0 ? Math.round(((propsThisPeriod - propsPrevPeriod) / propsPrevPeriod) * 100) : 0

  const won = opportunities.filter((o) => o.status === "won").length
  const lost = opportunities.filter((o) => o.status === "lost").length
  const totalClosed = won + lost
  const winRate = totalClosed > 0 ? Math.round((won / totalClosed) * 100) : 0

  const prevWon = prevOpportunities.filter((o) => o.status === "won").length
  const prevLost = prevOpportunities.filter((o) => o.status === "lost").length
  const prevTotalClosed = prevWon + prevLost
  const prevWinRate = prevTotalClosed > 0 ? Math.round((prevWon / prevTotalClosed) * 100) : 0
  const winRateChange = prevWinRate > 0 ? winRate - prevWinRate : 0

  const pipelineValue = opportunities
    .filter((o) => ["new", "viewed", "proposing", "proposed", "negotiating"].includes((o.status as string) ?? ""))
    .reduce((sum, o) => sum + ((parseFloat((o.budget_max as string) ?? "0") || parseFloat((o.budget_min as string) ?? "0")) || 0), 0)

  const prevPipelineValue = prevOpportunities
    .filter((o) => ["new", "viewed", "proposing", "proposed", "negotiating"].includes((o.status as string) ?? ""))
    .reduce((sum, o) => sum + ((parseFloat((o.budget_max as string) ?? "0") || parseFloat((o.budget_min as string) ?? "0")) || 0), 0)

  const pvChange = prevPipelineValue > 0 ? Math.round(((pipelineValue - prevPipelineValue) / prevPipelineValue) * 100) : 0

  const dailyCounts: Record<string, { total: number; highScore: number }> = {}
  for (const opp of opportunities) {
    const d = (opp.created_at as string ?? "").slice(0, 10)
    if (!dailyCounts[d]) dailyCounts[d] = { total: 0, highScore: 0 }
    dailyCounts[d].total++
    if ((opp.ai_score as number) >= 70) dailyCounts[d].highScore++
  }
  const dailyData = Object.entries(dailyCounts).sort(([a], [b]) => a.localeCompare(b)).map(([date, counts]) => ({
    date: date.slice(5),
    total: counts.total,
    highScore: counts.highScore,
  }))

  const scoreBuckets = [0, 0, 0, 0, 0]
  for (const opp of opportunities) {
    const score = opp.ai_score as number ?? 0
    if (score <= 20) scoreBuckets[0]++
    else if (score <= 40) scoreBuckets[1]++
    else if (score <= 60) scoreBuckets[2]++
    else if (score <= 80) scoreBuckets[3]++
    else scoreBuckets[4]++
  }
  const scoreDistData = [
    { range: "0–20", count: scoreBuckets[0] },
    { range: "21–40", count: scoreBuckets[1] },
    { range: "41–60", count: scoreBuckets[2] },
    { range: "61–80", count: scoreBuckets[3] },
    { range: "81–100", count: scoreBuckets[4] },
  ]

  type PlatformRow = { platformId: string; platformName: string; platformSlug: string; platformLogo: string | null; opps: number; avgScore: number; proposals: number; won: number; winRate: number; avgDeal: number }
  const platformRows: PlatformRow[] = platforms.map((p) => {
    const opps = opportunities.filter((o) => o.platform_id === p.id)
    const oppCount = opps.length
    const avgScore = oppCount > 0 ? Math.round(opps.reduce((s, o) => s + ((o.ai_score as number) ?? 0), 0) / oppCount) : 0
    const proposalCount = proposals.filter((pr) => opps.some((o) => o.id === pr.opportunity_id)).length
    const wonCount = opps.filter((o) => o.status === "won").length
    const totalClosed = wonCount + opps.filter((o) => o.status === "lost").length
    const wRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0
    const deals = opps.filter((o) => o.budget_max != null || o.budget_min != null)
    const avgDeal = deals.length > 0 ? Math.round(deals.reduce((s, o) => s + (parseFloat((o.budget_max as string) ?? (o.budget_min as string) ?? "0") || 0), 0) / deals.length) : 0
    return { platformId: p.id, platformName: p.name, platformSlug: p.slug, platformLogo: p.logo_url, opps: oppCount, avgScore, proposals: proposalCount, won: wonCount, winRate: wRate, avgDeal }
  }).filter((r) => r.opps > 0 || r.proposals > 0)

  const topOpps = opportunities
    .filter((o) => o.ai_score != null)
    .sort((a, b) => ((b.ai_score as number) ?? 0) - ((a.ai_score as number) ?? 0))
    .slice(0, 10)
    .map((o) => ({
      id: o.id as string,
      title: o.title as string,
      platformName: platformMap.get(o.platform_id as string)?.name ?? "Unknown",
      platformLogo: platformMap.get(o.platform_id as string)?.logo_url ?? null,
      score: (o.ai_score as number) ?? 0,
      status: (o.status as string) ?? "new",
      budget: [o.budget_min, o.budget_max].filter((b) => b != null).map((b) => `$${b}`).join(" – ") || "—",
      createdAt: (o.created_at as string) ?? "",
    }))

  const proposalStats = {
    sent: proposals.filter((p) => p.sent_at != null).length,
    responses: proposals.filter((p) => p.response_received_at != null).length,
    accepted: proposals.filter((p) => p.outcome === "accepted").length,
    rejected: proposals.filter((p) => p.outcome === "rejected").length,
    noResponse: proposals.filter((p) => p.sent_at != null && p.outcome == null).length,
    avgRating: proposals.length > 0
      ? (proposals.reduce((s, p) => s + ((p.rating as number) ?? 0), 0) / proposals.length)
      : 0,
  }

  const toneRatings: Record<string, { count: number; totalRating: number }> = {}
  for (const p of proposals) {
    const tone = (p.tone as string) ?? "professional"
    if (!toneRatings[tone]) toneRatings[tone] = { count: 0, totalRating: 0 }
    toneRatings[tone].count++
    toneRatings[tone].totalRating += (p.rating as number) ?? 0
  }
  const tonePerformance = Object.entries(toneRatings).map(([tone, data]) => ({
    tone,
    avgRating: data.count > 0 ? Math.round((data.totalRating / data.count) * 10) / 10 : 0,
    count: data.count,
  })).sort((a, b) => b.avgRating - a.avgRating)

  const wonRevenue = opportunities
    .filter((o) => o.status === "won")
    .reduce((sum, o) => sum + ((parseFloat((o.budget_max as string) ?? (o.budget_min as string) ?? "0")) || 0), 0)

  const platformRevenue: Record<string, number> = {}
  for (const o of opportunities.filter((opp) => opp.status === "won")) {
    const pid = o.platform_id as string
    const val = parseFloat((o.budget_max as string) ?? (o.budget_min as string) ?? "0") || 0
    platformRevenue[pid] = (platformRevenue[pid] ?? 0) + val
  }
  const bestPlatformRevenue = Object.entries(platformRevenue).sort(([, a], [, b]) => b - a)[0]
  const bestPlatformName = bestPlatformRevenue ? platformMap.get(bestPlatformRevenue[0])?.name ?? "Unknown" : "—"
  const wonDealCount = opportunities.filter((o) => o.status === "won").length
  const avgDealSize = wonDealCount > 0 ? Math.round(wonRevenue / wonDealCount) : 0

  return (
    <AnalyticsClient
      range={range}
      isPro={isPro}
      statCards={{
        opportunitiesDiscovered: { value: oppsThisPeriod, change: oppChange },
        proposalsSent: { value: propsThisPeriod, change: propChange },
        winRate: { value: winRate, change: winRateChange },
        pipelineValue: { value: pipelineValue, change: pvChange },
      }}
      dailyData={dailyData}
      scoreDistData={scoreDistData}
      platformRows={platformRows}
      topOpps={topOpps}
      proposalStats={proposalStats}
      tonePerformance={tonePerformance}
      revenueMetrics={{
        wonRevenue,
        avgDealSize,
        bestPlatformName,
        wonDealCount,
      }}
    />
  )
}
