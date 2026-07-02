import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { createSubscriptionCheckout } from "@/lib/suby"
import { safePlan, type PlanTier } from "@/lib/plan-limits"
import { checkOrigin } from "@/lib/csrf"

// Creates a Suby.fi subscription checkout session for the logged-in user and
// returns the hosted checkout URL. The plan is NOT activated here — that
// happens in the /api/payments/webhook route after Suby confirms payment
// (CHECKOUT_SUCCESS / PAYMENT_SUCCESS). This prevents free upgrades.
export async function POST(request: NextRequest) {
  // CSRF: reject cross-origin form posts.
  const originError = checkOrigin(request)
  if (originError) return originError

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://seerist.xyz"
    const result = await createSubscriptionCheckout({
      plan: plan as "pro" | "agency",
      annual: Boolean(annual),
      userId,
      customerEmail: userData.user?.email ?? undefined,
      successUrl: `${appUrl}/settings/billing?upgrade=success`,
      cancelUrl: `${appUrl}/settings/billing?upgrade=cancelled`,
    })

    return NextResponse.json({
      success: true,
      redirectUrl: result.data.paymentUrl,
      paymentId: result.data.paymentId,
    })
  } catch (err) {
    console.error("Checkout error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Reference safePlan to keep tree-shaking from dropping the export; the tier
// type is used by callers.
export const _planTier = (p: string): PlanTier => safePlan(p)
