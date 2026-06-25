import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { admin } from "@/lib/insforge"
import { PLAN_LIMITS, PLAN_PRICES, type PlanTier } from "@/lib/plan-limits"

// Creates (or reactivates) a subscription for the logged-in user and activates
// the plan. Authenticated via the user's session cookie.
//
// NOTE: This activates the plan directly. To require a real Stripe payment,
// wire `admin.payments.stripe.createCheckoutSession(...)` here and gate plan
// activation behind the Stripe webhook (payment-webhook edge function).
export async function POST(request: NextRequest) {
  try {
    const insforge = createServerClient({ cookies: await cookies() })
    const { data: userData, error: authError } = await insforge.auth.getCurrentUser()
    const userId = userData?.user?.id
    if (authError || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { plan, annual } = body as { plan?: string; annual?: boolean }

    if (plan !== "pro" && plan !== "agency") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const tier = plan as PlanTier
    const limits = PLAN_LIMITS[tier]
    const now = new Date()
    const periodEnd = new Date(now)
    if (annual) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    const { data: existingSub } = await admin.database
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (existingSub) {
      await admin.database
        .from("subscriptions")
        .update({
          plan,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          monthly_opportunity_quota: limits.opportunities,
          monthly_proposal_quota: limits.proposals,
          updated_at: now.toISOString(),
        })
        .eq("id", (existingSub as { id: string }).id)
        .eq("user_id", userId)
    } else {
      await admin.database.from("subscriptions").insert([{
        user_id: userId,
        plan,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        monthly_opportunity_quota: limits.opportunities,
        monthly_proposal_quota: limits.proposals,
      }])
    }

    await admin.database
      .from("profiles")
      .update({ plan, updated_at: now.toISOString() })
      .eq("id", userId)

    return NextResponse.json({
      success: true,
      plan,
      annual: Boolean(annual),
      amount: annual ? PLAN_PRICES[tier].annual : PLAN_PRICES[tier].monthly,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://seerist.xyz"}/settings/billing?success=true`,
    })
  } catch (err) {
    console.error("Checkout error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
