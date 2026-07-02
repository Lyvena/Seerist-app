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

export function getPlanLimits(plan: string | null | undefined): { products: number; platforms: number; opportunities: number; proposals: number } {
  const tier = safePlan(plan)
  return PLAN_LIMITS[tier]
}

export function canAddProduct(plan: string | null | undefined, currentCount: number): { allowed: boolean; reason?: string } {
  const limits = getPlanLimits(plan)
  if (currentCount >= limits.products) {
    return { allowed: false, reason: `Your ${PLAN_NAMES[safePlan(plan)]} plan allows up to ${limits.products === Infinity ? "unlimited" : limits.products} product${limits.products === 1 ? "" : "s"}. Upgrade to add more.` }
  }
  return { allowed: true }
}

export function canAccessPlatform(plan: string | null | undefined, platformIndex: number): { allowed: boolean; reason?: string } {
  const limits = getPlanLimits(plan)
  if (platformIndex >= limits.platforms) {
    return { allowed: false, reason: `Your ${PLAN_NAMES[safePlan(plan)]} plan allows up to ${limits.platforms} platforms. Upgrade to access all 14.` }
  }
  return { allowed: true }
}

export function canGenerateProposal(plan: string | null | undefined, currentMonthlyCount: number): { allowed: boolean; reason?: string } {
  const limits = getPlanLimits(plan)
  if (currentMonthlyCount >= limits.proposals) {
    const limitStr = limits.proposals === Infinity ? "unlimited" : limits.proposals
    return { allowed: false, reason: `Your ${PLAN_NAMES[safePlan(plan)]} plan allows ${limitStr} proposals per month. You've reached your limit. Upgrade for more.` }
  }
  return { allowed: true }
}

export function canUseFeature(plan: string | null | undefined, feature: "autoPropose" | "analytics" | "whiteLabel" | "apiAccess"): boolean {
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
