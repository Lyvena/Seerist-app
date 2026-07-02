/**
 * Plan tier limits + access checks.
 *
 * The project owner gets unlimited access forever, regardless of subscription
 * state. This is enforced in code (not just the DB) so a subscription webhook
 * or accidental DB change can never downgrade the owner.
 */

/** Email addresses with permanent unlimited (Agency-equivalent) access. */
const OWNER_EMAILS = new Set<string>([
  "akshay@lyvena.xyz",
])

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase()
}

/** Returns true if the given email is a project owner with permanent access. */
export function isOwnerEmail(email: string | null | undefined): boolean {
  return OWNER_EMAILS.has(normalizeEmail(email))
}

export const PLAN_LIMITS = {
  free: { products: 1, platforms: 5, opportunities: 100, proposals: 20 },
  pro: { products: 3, platforms: 14, opportunities: Infinity, proposals: 100 },
  agency: { products: Infinity, platforms: 14, opportunities: Infinity, proposals: Infinity },
}

export type PlanTier = keyof typeof PLAN_LIMITS

export const PLAN_NAMES: Record<PlanTier, string> = {
  free: "Free",
  pro: "Pro",
  agency: "Agency",
}

export const PLAN_PRICES: Record<PlanTier, { monthly: number; annual: number }> = {
  free: { monthly: 0, annual: 0 },
  pro: { monthly: 29, annual: 290 },
  agency: { monthly: 79, annual: 790 },
}

const UNLIMITED = PLAN_LIMITS.agency

/**
 * Resolve the effective plan for a user. Owners are always treated as agency
 * regardless of their stored plan/subscription.
 */
export function effectivePlan(plan: string | null | undefined, email?: string | null | undefined): PlanTier {
  if (email && isOwnerEmail(email)) return "agency"
  return safePlan(plan)
}

export function getPlanLimits(plan: string | null | undefined, email?: string | null | undefined): { products: number; platforms: number; opportunities: number; proposals: number } {
  if (email && isOwnerEmail(email)) return UNLIMITED
  return PLAN_LIMITS[safePlan(plan)]
}

export function canAddProduct(
  plan: string | null | undefined,
  currentCount: number,
  email?: string | null | undefined
): { allowed: boolean; reason?: string } {
  if (email && isOwnerEmail(email)) return { allowed: true }
  const limits = getPlanLimits(plan)
  if (currentCount >= limits.products) {
    return { allowed: false, reason: `Your ${PLAN_NAMES[safePlan(plan)]} plan allows up to ${limits.products === Infinity ? "unlimited" : limits.products} product${limits.products === 1 ? "" : "s"}. Upgrade to add more.` }
  }
  return { allowed: true }
}

export function canAccessPlatform(
  plan: string | null | undefined,
  platformIndex: number,
  email?: string | null | undefined
): { allowed: boolean; reason?: string } {
  if (email && isOwnerEmail(email)) return { allowed: true }
  const limits = getPlanLimits(plan)
  if (platformIndex >= limits.platforms) {
    return { allowed: false, reason: `Your ${PLAN_NAMES[safePlan(plan)]} plan allows up to ${limits.platforms} platforms. Upgrade to access all 14.` }
  }
  return { allowed: true }
}

export function canGenerateProposal(
  plan: string | null | undefined,
  currentMonthlyCount: number,
  email?: string | null | undefined
): { allowed: boolean; reason?: string } {
  if (email && isOwnerEmail(email)) return { allowed: true }
  const limits = getPlanLimits(plan)
  if (currentMonthlyCount >= limits.proposals) {
    const limitStr = limits.proposals === Infinity ? "unlimited" : limits.proposals
    return { allowed: false, reason: `Your ${PLAN_NAMES[safePlan(plan)]} plan allows ${limitStr} proposals per month. You've reached your limit. Upgrade for more.` }
  }
  return { allowed: true }
}

export function canUseFeature(
  plan: string | null | undefined,
  feature: "autoPropose" | "analytics" | "whiteLabel" | "apiAccess",
  email?: string | null | undefined
): boolean {
  if (email && isOwnerEmail(email)) return true
  const tier = safePlan(plan)
  switch (feature) {
    case "autoPropose": return tier === "pro" || tier === "agency"
    case "analytics": return tier === "pro" || tier === "agency"
    case "whiteLabel": return tier === "agency"
    case "apiAccess": return tier === "agency"
  }
}

export function safePlan(plan: string | null | undefined): PlanTier {
  if (plan === "pro" || plan === "agency") return plan
  return "free"
}
