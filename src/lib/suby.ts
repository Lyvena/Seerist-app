/**
 * Suby.fi payment integration client.
 *
 * Docs: https://documentation.suby.fi/api-reference/introduction
 * Base URL: https://api.suby.fi
 * Auth: X-Suby-Api-Key header (server-side only).
 *
 * Suby is the merchant of record — it hosts the checkout page (`paymentUrl`),
 * handles renewals + dunning, and fires signed webhooks. We never see or store
 * card details.
 */

const SUBY_BASE_URL = "https://api.suby.fi"

function getApiKey(): string {
  const key = process.env.SUBY_API_KEY
  if (!key) {
    throw new Error("SUBY_API_KEY is not set. Add it via `insforge secrets add SUBY_API_KEY <value>`.")
  }
  return key
}

export interface SubySubscriptionCreateResponse {
  success: boolean
  data: {
    paymentId: string
    paymentUrl: string
    metadata?: Record<string, unknown> | null
  }
}

export interface SubySubscriptionCancelResponse {
  success: boolean
  data: { id: string; status: string }
}

/** Product IDs configured in the Suby dashboard (one per plan × billing cycle). */
function getProductId(plan: "pro" | "agency", annual: boolean): string {
  const key = annual ? `${plan.toUpperCase()}_ANNUAL_PRODUCT_ID` : `${plan.toUpperCase()}_MONTHLY_PRODUCT_ID`
  const id = process.env[key]
  if (!id) {
    throw new Error(
      `${key} is not set. Create the ${plan} ${annual ? "annual" : "monthly"} subscription product in the Suby dashboard and add its ID via \`insforge secrets add ${key} <value>\`.`
    )
  }
  return id
}

/**
 * Create a Suby subscription checkout session for the given plan.
 * Returns the hosted checkout URL to redirect the user to.
 *
 * We pass `userId` + `plan` in `metadata` and as `externalRef` so the webhook
 * can reconcile the payment back to the Seerist user without relying on email
 * matching.
 */
export async function createSubscriptionCheckout(opts: {
  plan: "pro" | "agency"
  annual: boolean
  userId: string
  customerEmail?: string
  successUrl: string
  cancelUrl: string
}): Promise<SubySubscriptionCreateResponse> {
  const productId = getProductId(opts.plan, opts.annual)
  const body: Record<string, unknown> = {
    productId,
    externalRef: opts.userId,
    metadata: { seerist_user_id: opts.userId, plan: opts.plan, annual: opts.annual },
    successUrl: opts.successUrl,
    cancelUrl: opts.cancelUrl,
  }
  if (opts.customerEmail) body.customerEmail = opts.customerEmail

  const res = await fetch(`${SUBY_BASE_URL}/api/subscription/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Suby-Api-Key": getApiKey(),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.success) {
    const msg = data?.error?.message ?? data?.error ?? `Suby checkout failed (HTTP ${res.status})`
    throw new Error(typeof msg === "string" ? msg : "Suby checkout failed")
  }
  return data as SubySubscriptionCreateResponse
}

/** Cancel a Suby subscription at the end of the current billing period. */
export async function cancelSubscription(subscriptionId: string): Promise<SubySubscriptionCancelResponse> {
  const res = await fetch(`${SUBY_BASE_URL}/api/subscription/${encodeURIComponent(subscriptionId)}`, {
    method: "DELETE",
    headers: { "X-Suby-Api-Key": getApiKey() },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.success) {
    const msg = data?.error?.message ?? data?.error ?? `Suby cancel failed (HTTP ${res.status})`
    throw new Error(typeof msg === "string" ? msg : "Suby cancel failed")
  }
  return data as SubySubscriptionCancelResponse
}

/**
 * Verify a Suby webhook signature.
 *
 * Suby sends `X-Webhook-Signature: v1={hmac_hex}` where the HMAC is
 * SHA-256 of the raw request body using the webhook signing secret.
 */
export async function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const secret = process.env.SUBY_WEBHOOK_SECRET
  if (!secret) return false
  if (!signatureHeader) return false

  // Format: "v1={hex}"
  const match = signatureHeader.match(/v1=([a-f0-9]+)/i)
  if (!match) return false
  const provided = match[1].toLowerCase()

  const { createHmac } = await import("node:crypto")
  const computed = createHmac("sha256", secret).update(rawBody).digest("hex").toLowerCase()

  // Constant-time compare
  if (provided.length !== computed.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) {
    diff |= provided.charCodeAt(i) ^ computed.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Parse the Suby webhook event into a normalized shape.
 *
 * Suby fires payment events (CHECKOUT_SUCCESS, PAYMENT_SUCCESS, PAYMENT_FAILED,
 * PAYMENT_REFUNDED) and subscription events (SUBSCRIPTION_PAST_DUE,
 * SUBSCRIPTION_EXPIRED). The event type arrives in the `X-Webhook-Event`
 * header; the body carries the payment/subscription details.
 */
export interface SubyWebhookEvent {
  eventType: string
  // Reconciled Seerist user id (from metadata or externalRef)
  userId: string | null
  plan: "pro" | "agency" | null
  subscriptionId: string | null
  paymentId: string | null
  amountCents: number | null
  currency: string | null
}

export function parseWebhookEvent(eventType: string, body: Record<string, unknown>): SubyWebhookEvent {
  const context = (body.context as Record<string, unknown> | undefined) ?? {}
  const metadata = (body.metadata ?? context.metadata ?? {}) as Record<string, unknown>
  const userId =
    (metadata.seerist_user_id as string) ??
    (body.externalRef as string) ??
    (context.externalRef as string) ??
    null
  const plan = (metadata.plan as string) ?? null

  return {
    eventType,
    userId,
    plan: plan === "pro" || plan === "agency" ? plan : null,
    subscriptionId: (body.subscriptionId as string) ?? (body.subscription_id as string) ?? null,
    paymentId: (body.paymentId as string) ?? (body.payment_id as string) ?? (body.id as string) ?? null,
    amountCents: (body.amountCents as number) ?? (body.amount_cents as number) ?? (body.amount as number) ?? null,
    currency: (body.currency as string) ?? null,
  }
}
