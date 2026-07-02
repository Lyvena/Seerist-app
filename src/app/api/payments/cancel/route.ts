import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { admin } from "@/lib/insforge"
import { cancelSubscription } from "@/lib/suby"
import { checkOrigin } from "@/lib/csrf"

/**
 * Cancel the current user's Suby subscription. Cancels at period end so the
 * user keeps access until the cycle they paid for ends, then downgrades to
 * free automatically via the SUBSCRIPTION_EXPIRED webhook.
 */
export async function POST(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  try {
    const insforge = createServerClient({ cookies: await cookies() })
    const { data: userData, error: authError } = await insforge.auth.getCurrentUser()
    const userId = userData?.user?.id
    if (authError || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Look up the Suby subscription id for this user.
    const { data: sub } = await admin.database
      .from("subscriptions")
      .select("id, payment_provider_id")
      .eq("user_id", userId)
      .maybeSingle()

    const subscriptionId = (sub as { payment_provider_id?: string } | null)?.payment_provider_id
    if (!subscriptionId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    await cancelSubscription(subscriptionId)

    // Mark cancel_at_period_end locally; the webhook flips to free on expiry.
    await admin.database
      .from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Cancel error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
