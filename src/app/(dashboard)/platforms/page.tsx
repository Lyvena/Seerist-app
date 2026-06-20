import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { PlatformsClient } from "@/components/platforms/PlatformsClient"

export default async function PlatformsPage() {
  const insforge = createServerClient({ cookies: await cookies() })

  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id

  const { data: profileData } = await insforge.database
    .from("profiles")
    .select("plan")
    .eq("id", userId ?? "")
    .single()

  const plan = ((profileData ?? {}) as Record<string, unknown>)?.plan as string ?? "free"

  const { data: platformsData } = await insforge.database
    .from("platforms")
    .select("id, slug, name, base_url, logo_url, category, is_supported")
    .order("name")

  const platforms = (platformsData ?? []) as Array<{
    id: string
    slug: string
    name: string
    base_url: string
    logo_url: string | null
    category: string | null
    is_supported: boolean
  }>

  const { data: configsData } = await insforge.database
    .from("user_platform_configs")
    .select("platform_id, is_enabled, min_score, auto_propose, notify_email, custom_keywords")
    .eq("user_id", userId ?? "")

  const configs = (configsData ?? []) as Array<{
    platform_id: string
    is_enabled: boolean
    min_score: number
    auto_propose: boolean
    notify_email: boolean
    custom_keywords: string[]
  }>

  const configMap: Record<string, typeof configs[0]> = {}
  for (const c of configs) configMap[c.platform_id] = c

  const { data: opps } = await insforge.database
    .from("opportunities")
    .select("platform_id, ai_score, status, created_at")
    .eq("user_id", userId ?? "")

  const oppsList = (opps ?? []) as Array<{
    platform_id: string
    ai_score: number | null
    status: string | null
    created_at: string
  }>

  const statsMap: Record<string, { thisWeek: number; avgScore: number; proposalsSent: number }> = {}
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  for (const o of oppsList) {
    if (!statsMap[o.platform_id]) statsMap[o.platform_id] = { thisWeek: 0, avgScore: 0, proposalsSent: 0 }
    const s = statsMap[o.platform_id]
    if (o.created_at >= oneWeekAgo) s.thisWeek++
    if (o.ai_score != null) {
      s.avgScore = s.avgScore === 0 ? o.ai_score : Math.round((s.avgScore + o.ai_score) / 2)
    }
    if (o.status === "proposed" || o.status === "won") s.proposalsSent++
  }

  return (
    <PlatformsClient
      platforms={platforms}
      configMap={configMap}
      statsMap={statsMap}
      plan={plan}
      userId={userId ?? ""}
    />
  )
}
