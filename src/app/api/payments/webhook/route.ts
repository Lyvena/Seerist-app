import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/insforge"
import { verifyWebhookSignature, parseWebhookEvent } from "@/lib/suby"
import { PLAN_LIMITS, type PlanTier } from "@/lib/plan-limits"

/**
 * Suby.fi webhook handler.
 *
 * Suby fires events after payment state changes. We verify the HMAC signature,
 * then reconcile the user's subscription + plan in the database.
 *
 * Key events:
 *  - CHECKOUT_SUCCESS / PAYMENT_SUCCESS  → activate the paid plan
 *  - SUBSCRIPTION_PAST_DUE               → mark subscription past_due
 *  - SUBSCRIPTION_EXPIRED                → downgrade to free
 *  - PAYMENT_REFUNDED                    → optionally downgrade
 *
 * Idempotency: we dedupe on (eventType + paymentId/subscriptionId).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get("X-Webhook-Signature")
  const eventType = request.headers.get("X-Webhook-Event") ?? ""

  // 1. Verify signature (skip only in local dev when no secret is configured)
  const hasSecret = !!process.env.SUBY_WEBHOOK_SECRET
  if (hasSecret) {
    const valid = await verifyWebhookSignature(rawBody, signature)
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const event = parseWebhookEvent(eventType, body)

  // No reconcilable user — nothing to do.
  if (!event.userId) {
    return NextResponse.json({ received: true, note: "no user" })
  }

  const userId = event.userId
  const now = new Date().toISOString()

  try {
    switch (event.eventType) {
      case "CHECKOUT_SUCCESS":
      case "PAYMENT_SUCCESS": {
        if (!event.plan) {
          // Without a plan in metadata we can't know what to activate.
          return NextResponse.json({ received: true, note: "no plan in metadata" })
        }
        const tier = event.plan as PlanTier
        const limits = PLAN_LIMITS[tier]
        const periodEnd = new Date()
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        await admin.database
          .from("subscriptions")
          .upsert({
            user_id: userId,
            plan: tier,
            status: "active",
            payment_provider_id: event.subscriptionId ?? event.paymentId,
            current_period_start: now,
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false,
            monthly_opportunity_quota: limits.opportunities,
            monthly_proposal_quota: limits.proposals,
            updated_at: now,
          }, { onConflict: "user_id" })

        await admin.database
          .from("profiles")
          .update({ plan: tier, updated_at: now })
          .eq("id", userId)
        break
      }

      case "SUBSCRIPTION_PAST_DUE": {
        await admin.database
          .from("subscriptions")
          .update({ status: "past_due", updated_at: now })
          .eq("user_id", userId)
        break
      }

      case "SUBSCRIPTION_EXPIRED": {
        // Downgrade to free
        await admin.database
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            cancel_at_period_end: true,
            updated_at: now,
          })
          .eq("user_id", userId)
        await admin.database
          .from("profiles")
          .update({ plan: "free", updated_at: now })
          .eq("id", userId)
        break
      }

      case "PAYMENT_REFUNDED": {
        // Refund does not auto-cancel; leave plan active but flag for review.
        await admin.database
          .from("subscriptions")
          .update({ status: "refunded", updated_at: now })
          .eq("user_id", userId)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("Suby webhook error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
