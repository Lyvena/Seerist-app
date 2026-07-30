// @include _shared
// ============================================================================
// creem-webhook — Billing (Creem). Register this function's URL
// (/functions/creem-webhook) as the webhook endpoint in the Creem dashboard.
// Verifies the creem-signature header (HMAC-SHA256 with CREEM_WEBHOOK_SECRET)
// and processes subscription lifecycle events against
// organizations.billing_status. Uses the service role (no user session).
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

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const rawBody = await req.text();

  const secret = Deno.env.get('CREEM_WEBHOOK_SECRET');
  if (secret) {
    const provided = req.headers.get('creem-signature') || '';
    const expected = await hmacSha256Hex(secret, rawBody);
    if (provided !== expected) return json({ error: 'Invalid webhook signature' }, 401);
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
  const orgId: string | null =
    obj.metadata?.organization_id || obj.request_id || event.metadata?.organization_id || null;

  if (!orgId) return json({ received: true, note: 'No organization_id in event metadata — ignored.' });

  try {
    // Lifetime founder orgs are never touched by billing events (a DB trigger
    // enforces this too — this check just avoids pointless writes/logs).
    const org = (await dbSelect('organizations', `id=eq.${orgId}&select=plan&limit=1`, SERVICE_KEY))[0];
    if (org?.plan === 'lifetime_founder') {
      return json({ received: true, note: 'Organization has a lifetime founder grant — billing events are ignored.' });
    }

    const patch: Record<string, unknown> = {};
    if (type.includes('checkout.completed') || type.includes('subscription.active') || type.includes('subscription.paid')) {
      patch.billing_status = 'active';
      if (obj.customer?.id || obj.customer_id) patch.creem_customer_id = obj.customer?.id || obj.customer_id;
      if (obj.metadata?.plan) patch.plan = obj.metadata.plan;
    } else if (type.includes('subscription.past_due') || type.includes('payment.failed')) {
      patch.billing_status = 'past_due';
    } else if (type.includes('subscription.canceled') || type.includes('subscription.expired')) {
      patch.billing_status = 'canceled';
    }

    if (Object.keys(patch).length) {
      await dbPatch('organizations', `id=eq.${orgId}`, patch, SERVICE_KEY);
      await logPersona({
        organization_id: orgId,
        persona: 'System',
        action: 'billing_event',
        params: { type },
        result: `Creem event applied: ${JSON.stringify(patch)}`,
      }, SERVICE_KEY);
    }

    return json({ received: true, applied: patch });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'webhook processing failed' }, 500);
  }
}
