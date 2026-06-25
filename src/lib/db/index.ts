import { insforgeAdmin } from "../insforge/client"
import type {
  Product,
  Opportunity,
  Proposal,
  PipelineEntry,
  Platform,
  UserPlatformConfig,
  Profile,
  Notification,
  ActivityLog,
  AlertPreference,
  Subscription,
  CreateProductInput,
  CreateProposalInput,
  UpdatePipelineInput,
  OpportunityStatus,
  PipelineStage,
} from "./schemas"

const admin = insforgeAdmin

// Re-export schemas & types
export * from "./schemas"

// ─── Products ──────────────────────────────────────────────────────────────
export async function getProducts(userId: string): Promise<Product[]> {
  const { data, error } = await admin.database
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as Product[]
}

export async function getProduct(id: string, userId: string): Promise<Product | null> {
  const { data, error } = await admin.database
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data as Product | null
}

export async function createProduct(input: CreateProductInput): Promise<{ id: string; error: string | null }> {
  const { data, error } = await admin.database
    .from("products")
    .insert([{ ...input }])
    .select("id")
    .single()

  return { id: (data as { id: string })?.id ?? "", error: error?.message ?? null }
}

export async function updateProduct(id: string, userId: string, updates: Partial<Product>): Promise<{ error: string | null }> {
  const { error } = await admin.database
    .from("products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)

  return { error: error?.message ?? null }
}

export async function deleteProduct(id: string, userId: string): Promise<{ error: string | null }> {
  const { error } = await admin.database
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)

  return { error: error?.message ?? null }
}

// ─── Opportunities ─────────────────────────────────────────────────────────
export async function getOpportunities(
  userId: string,
  filters?: {
    status?: OpportunityStatus[]
    minScore?: number
    maxScore?: number
    platform?: string
    limit?: number
    offset?: number
  }
): Promise<{ data: Opportunity[]; count: number }> {
  let query = admin.database
    .from("opportunities")
    .select("*", { count: "exact" })
    .eq("user_id", userId)

  if (filters?.status?.length) {
    query = query.in("status", filters.status)
  }
  if (filters?.minScore !== undefined) {
    query = query.gte("ai_score", filters.minScore)
  }
  if (filters?.maxScore !== undefined) {
    query = query.lte("ai_score", filters.maxScore)
  }
  if (filters?.platform) {
    query = query.eq("platform_id", filters.platform)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 20))
  }

  const { data, count, error } = await query
  if (error) throw error
  return { data: (data ?? []) as Opportunity[], count: count ?? 0 }
}

export async function getOpportunity(id: string, userId: string): Promise<Opportunity | null> {
  const { data, error } = await admin.database
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data as Opportunity | null
}

export async function getHighScoreOpportunities(userId: string, threshold = 80, limit = 20): Promise<Opportunity[]> {
  const { data, error } = await admin.database
    .from("opportunities")
    .select("*")
    .eq("user_id", userId)
    .gte("ai_score", threshold)
    .in("status", ["new", "viewed"])
    .order("ai_score", { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Opportunity[]
}

export async function updateOpportunityStatus(
  id: string,
  userId: string,
  status: OpportunityStatus
): Promise<{ error: string | null }> {
  const { error } = await admin.database
    .from("opportunities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)

  return { error: error?.message ?? null }
}

// ─── Proposals ─────────────────────────────────────────────────────────────
export async function getProposals(userId: string): Promise<Proposal[]> {
  const { data, error } = await admin.database
    .from("proposals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as Proposal[]
}

export async function getProposal(id: string, userId: string): Promise<Proposal | null> {
  const { data, error } = await admin.database
    .from("proposals")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data as Proposal | null
}

export async function createProposal(input: CreateProposalInput): Promise<{ id: string; error: string | null }> {
  const { data, error } = await admin.database
    .from("proposals")
    .insert([{ ...input }])
    .select("id")
    .single()

  return { id: (data as { id: string })?.id ?? "", error: error?.message ?? null }
}

export async function updateProposal(id: string, userId: string, updates: Partial<Proposal>): Promise<{ error: string | null }> {
  const { error } = await admin.database
    .from("proposals")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)

  return { error: error?.message ?? null }
}

// ─── Pipeline ──────────────────────────────────────────────────────────────
export async function getPipeline(userId: string): Promise<PipelineEntry[]> {
  const { data, error } = await admin.database
    .from("pipeline_entries")
    .select("*")
    .eq("user_id", userId)
    .order("stage_changed_at", { ascending: false, nullsFirst: false })

  if (error) throw error
  return (data ?? []) as PipelineEntry[]
}

export async function getPipelineByStage(userId: string, stage: PipelineStage): Promise<PipelineEntry[]> {
  const { data, error } = await admin.database
    .from("pipeline_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("stage", stage)
    .order("updated_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as PipelineEntry[]
}

export async function updatePipeline(id: string, userId: string, updates: UpdatePipelineInput): Promise<{ error: string | null }> {
  const { error } = await admin.database
    .from("pipeline_entries")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)

  return { error: error?.message ?? null }
}

export async function moveOpportunityToStage(
  opportunityId: string,
  userId: string,
  stage: PipelineStage
): Promise<{ error: string | null }> {
  const { data: existing } = await admin.database
    .from("pipeline_entries")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", userId)
    .maybeSingle()

  const now = new Date().toISOString()

  if (existing) {
    const { error } = await admin.database
      .from("pipeline_entries")
      .update({ stage, stage_changed_at: now, updated_at: now })
      .eq("id", (existing as { id: string }).id)
      .eq("user_id", userId)
    return { error: error?.message ?? null }
  }

  const { error } = await admin.database
    .from("pipeline_entries")
    .insert([{ opportunity_id: opportunityId, user_id: userId, stage, stage_changed_at: now }])
  return { error: error?.message ?? null }
}

// ─── Platforms ─────────────────────────────────────────────────────────────
// Platforms is a shared public catalog (no user_id). Per-user enablement lives
// in user_platform_configs.
export async function getSupportedPlatforms(): Promise<Platform[]> {
  const { data, error } = await admin.database
    .from("platforms")
    .select("*")
    .eq("is_supported", true)
    .order("name")

  if (error) throw error
  return (data ?? []) as Platform[]
}

export async function getUserPlatformConfigs(userId: string): Promise<UserPlatformConfig[]> {
  const { data, error } = await admin.database
    .from("user_platform_configs")
    .select("*")
    .eq("user_id", userId)

  if (error) throw error
  return (data ?? []) as UserPlatformConfig[]
}

// ─── Profile ───────────────────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await admin.database
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw error
  return data as Profile | null
}

// ─── Subscription ──────────────────────────────────────────────────────────
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await admin.database
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data as Subscription | null
}

// ─── Alerts ────────────────────────────────────────────────────────────────
export async function getAlertPreferences(userId: string): Promise<AlertPreference | null> {
  const { data, error } = await admin.database
    .from("alert_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data as AlertPreference | null
}

// ─── Notifications ─────────────────────────────────────────────────────────
export async function getNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const { data, error } = await admin.database
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Notification[]
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await admin.database
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) throw error
  return count ?? 0
}

// ─── Activity log ──────────────────────────────────────────────────────────
export async function logActivity(input: Omit<ActivityLog, "id" | "created_at">): Promise<void> {
  await admin.database.from("activity_log").insert([{ ...input }])
}

// ─── Stats ─────────────────────────────────────────────────────────────────
export async function getOpportunityStats(
  userId: string,
  dateFrom: string
): Promise<{ date: string; count: number }[]> {
  const { data, error } = await admin.database
    .from("opportunities")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", dateFrom)

  if (error) throw error

  const counts: Record<string, number> = {}
  for (const opp of data ?? []) {
    const date = (opp as { created_at: string }).created_at.slice(0, 10)
    counts[date] = (counts[date] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface DashboardStats {
  newOpportunities: number
  todayCount: number
  proposalsSent: number
  pipelineValue: number
  pipelineCurrency: string
  avgScore: number
  wonDeals: number
  starredCount: number
}

// Aggregated counts for the dashboard. Each query is independent so one failure
// doesn't blank the whole dashboard — unknowns default to 0.
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [
    newRes,
    todayRes,
    proposalsRes,
    pipelineRes,
    avgRes,
    wonRes,
    starredRes,
  ] = await Promise.all([
    admin.database
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["new", "viewed"]),
    admin.database
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfToday),
    admin.database
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["sent", "accepted"]),
    admin.database
      .from("pipeline_entries")
      .select("deal_value, deal_currency")
      .eq("user_id", userId)
      .in("stage", ["proposal_sent", "in_negotiation", "closed_won"])
      .not("deal_value", "is", null),
    admin.database
      .from("opportunities")
      .select("ai_score")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo)
      .not("ai_score", "is", null),
    admin.database
      .from("pipeline_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("stage", "closed_won"),
    admin.database
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_starred", true),
  ])

  const pipelineRows = (pipelineRes.data ?? []) as Array<{ deal_value: number | null; deal_currency: string }>
  const pipelineValue = pipelineRows.reduce((sum, r) => sum + (r.deal_value ?? 0), 0)
  const pipelineCurrency = pipelineRows[0]?.deal_currency ?? "USD"

  const scoreRows = (avgRes.data ?? []) as Array<{ ai_score: number }>
  const avgScore =
    scoreRows.length > 0
      ? Math.round(scoreRows.reduce((s, r) => s + r.ai_score, 0) / scoreRows.length)
      : 0

  return {
    newOpportunities: newRes.count ?? 0,
    todayCount: todayRes.count ?? 0,
    proposalsSent: proposalsRes.count ?? 0,
    pipelineValue,
    pipelineCurrency,
    avgScore,
    wonDeals: wonRes.count ?? 0,
    starredCount: starredRes.count ?? 0,
  }
}

