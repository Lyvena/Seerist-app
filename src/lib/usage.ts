import { admin } from "@/lib/insforge"
import { getPlanLimits } from "@/lib/plan-limits"

export async function getSubscription(userId: string) {
  const { data } = await admin.database
    .from("subscriptions")
    .select("plan, status, current_period_start, current_period_end, cancel_at_period_end, payment_provider_id, monthly_opportunity_quota, monthly_proposal_quota")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data ?? null) as {
    plan: string
    status: string | null
    current_period_start: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean | null
    payment_provider_id: string | null
    monthly_opportunity_quota: number | null
    monthly_proposal_quota: number | null
  } | null
}

export async function getUserPlan(userId: string): Promise<string> {
  const { data: profile } = await admin.database
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle()

  return (profile as { plan: string | null } | null)?.plan ?? "free"
}

export async function getMonthlyUsage(userId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [opportunities, proposals, products, platforms] = await Promise.all([
    admin.database.from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfMonth)
      .then(r => (r as any).count ?? 0),
    admin.database.from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfMonth)
      .then(r => (r as any).count ?? 0),
    admin.database.from("products")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .then(r => (r as any).count ?? 0),
    admin.database.from("user_platform_configs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_enabled", true)
      .then(r => (r as any).count ?? 0),
  ])

  return { opportunities, proposals, products, platforms }
}

export async function getUsageLimits(userId: string) {
  const plan = await getUserPlan(userId)
  const usage = await getMonthlyUsage(userId)
  const limits = getPlanLimits(plan)
  return { plan, usage, limits }
}
