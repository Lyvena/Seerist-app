// @include _shared
// ============================================================================
// creem-webhook — Billing (Creem, Merchant of Record).
//
// Register THIS function's URL in the Creem dashboard:
//   https://si9f4zab.eu-central.insforge.app/functions/creem-webhook
//
// Verifies the `creem-signature` header (HMAC-SHA256 hex over the raw body,
// compared in constant time) and applies the subscription lifecycle to
// organizations.billing_status / plan. Runs as the service role — Creem has no
// user session.
//
// Access semantics follow Creem's own guidance:
//   grant  → subscription.active, subscription.paid, subscription.trialing
//   revoke → subscription.expired, subscription.paused
//   other events are recorded but do not change access.
// ============================================================================

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time compare — a length-independent, early-exit-free equality. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

const GRANT = ['subscription.active', 'subscription.paid', 'subscription.trialing'];
const REVOKE = ['subscription.expired', 'subscription.paused'];

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const rawBody = await req.text();

  const secret = Deno.env.get('CREEM_WEBHOOK_SECRET');
  if (secret) {
    const provided = (req.headers.get('creem-signature') || '').trim();
    const expected = await hmacSha256Hex(secret, rawBody);
    if (!timingSafeEqual(provided, expected)) {
      return json({ error: 'Invalid webhook signature' }, 401);
    }
  } else {
    console.warn('CREEM_WEBHOOK_SECRET not set — accepting webhook UNVERIFIED. Set the secret before going live.');
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400);
  }

  const type: string = event.eventType || event.type || '';
  const obj = event.object || event.data || {};
  const metadata = obj.metadata || event.metadata || {};
  // Creem echoes back whatever we sent on the checkout: metadata, plus
  // request_id which we set to the organization id.
  const orgId: string | null =
    metadata.organization_id || metadata.referenceId || obj.request_id || null;

  if (!orgId) {
    return json({ received: true, note: 'No organization reference in the event — recorded and ignored.' });
  }

  try {
    const org = (await dbSelect('organizations', `id=eq.${orgId}&select=id,plan&limit=1`, SERVICE_KEY))[0];
    if (!org) return json({ received: true, note: 'Unknown organization — ignored.' });

    // A DB trigger also enforces this; the check just avoids pointless writes.
    if (org.plan === 'lifetime_founder') {
      return json({ received: true, note: 'Lifetime founder grant — billing events are ignored.' });
    }

    const patch: Record<string, unknown> = {};

    // Identity fields, whenever Creem gives them to us.
    const customerId = obj.customer?.id || obj.customer_id || null;
    if (customerId) patch.creem_customer_id = customerId;
    const subscriptionId = obj.subscription?.id || obj.subscription_id || (type.startsWith('subscription.') ? obj.id : null);
    if (subscriptionId) patch.creem_subscription_id = subscriptionId;
    const periodEnd = obj.current_period_end_date || obj.current_period_end || null;
    if (periodEnd) patch.current_period_end = new Date(periodEnd).toISOString();

    if (GRANT.includes(type)) {
      patch.billing_status = type === 'subscription.trialing' ? 'trial' : 'active';
      if (metadata.plan) {
        patch.plan = metadata.plan;
        if (metadata.interval) patch.plan_interval = metadata.interval;
      }
      // Trialing still grants access; resolveEntitlement treats it as paid.
      if (type === 'subscription.trialing') patch.billing_status = 'trialing';
    } else if (REVOKE.includes(type)) {
      patch.billing_status = 'canceled';
      patch.plan = 'free';
    } else if (type === 'subscription.past_due' || type === 'payment.failed') {
      patch.billing_status = 'past_due';
    } else if (type === 'subscription.canceled') {
      // Hard cancel: access ends now. A scheduled cancel keeps access until the
      // period ends, so it only records the intent.
      patch.billing_status = 'canceled';
      patch.plan = 'free';
    } else if (type === 'subscription.scheduled_cancel') {
      // Access continues to period end — status unchanged on purpose.
    } else if (type === 'checkout.completed') {
      // Access is granted by subscription.paid/active; this only links identity.
    }

    if (Object.keys(patch).length) {
      await dbPatch('organizations', `id=eq.${orgId}`, patch, SERVICE_KEY);
    }

    await logPersona({
      organization_id: orgId,
      persona: 'System',
      action: `creem:${type || 'unknown'}`,
      params: { type, subscription_id: subscriptionId, customer_id: customerId },
      result: Object.keys(patch).length
        ? `Applied ${JSON.stringify(patch)}`
        : 'Recorded; no access change for this event type.',
    }, SERVICE_KEY);

    return json({ received: true, applied: patch });
  } catch (e) {
    console.error(e);
    // Non-200 makes Creem retry (30s → 1m → 5m → 1h), which is what we want
    // for a transient failure.
    return json({ error: e instanceof Error ? e.message : 'webhook processing failed' }, 500);
  }
}
