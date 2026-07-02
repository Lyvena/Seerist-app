import { Suspense } from "react"
import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import BillingClient from "./BillingClient"
import { getSubscription, getMonthlyUsage } from "@/lib/usage"
import { getPlanLimits, PLAN_NAMES, effectivePlan, isOwnerEmail } from "@/lib/plan-limits"

export default async function BillingPage() {
  const insforge = createServerClient({ cookies: await cookies() })
  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id ?? ""
  const email = userData?.user?.email ?? ""

  const sub = await getSubscription(userId)
  const usage = await getMonthlyUsage(userId)
  const isOwner = isOwnerEmail(email)
  // Owners are always treated as agency regardless of stored plan.
  const plan = isOwner ? "agency" : (sub?.plan ?? "free")
  const limits = getPlanLimits(plan, email)

  return (
    <Suspense fallback={null}>
      <BillingClient
        plan={plan}
        planName={isOwner ? "Agency (Owner)" : (PLAN_NAMES[plan as keyof typeof PLAN_NAMES] ?? "Free")}
        status={isOwner ? "active" : (sub?.status ?? "active")}
        currentPeriodEnd={isOwner ? null : (sub?.current_period_end ?? null)}
        cancelAtPeriodEnd={isOwner ? false : (sub?.cancel_at_period_end ?? false)}
        paymentProviderId={isOwner ? null : (sub?.payment_provider_id ?? null)}
        usage={usage}
        limits={limits}
        invoices={[]}
        isOwner={isOwner}
      />
    </Suspense>
  )
}
