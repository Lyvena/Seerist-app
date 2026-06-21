import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import BillingClient from "./BillingClient"
import { getSubscription, getMonthlyUsage } from "@/lib/usage"
import { getPlanLimits, PLAN_NAMES } from "@/lib/plan-limits"

export default async function BillingPage() {
  const insforge = createServerClient({ cookies: await cookies() })
  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id ?? ""

  const sub = await getSubscription(userId)
  const usage = await getMonthlyUsage(userId)
  const plan = sub?.plan ?? "free"
  const limits = getPlanLimits(plan)

  return (
    <BillingClient
      plan={plan}
      planName={PLAN_NAMES[plan as keyof typeof PLAN_NAMES] ?? "Free"}
      status={sub?.status ?? "active"}
      currentPeriodEnd={sub?.current_period_end ?? null}
      cancelAtPeriodEnd={sub?.cancel_at_period_end ?? false}
      paymentProviderId={sub?.payment_provider_id ?? null}
      usage={usage}
      limits={limits}
      invoices={[]}
    />
  )
}
