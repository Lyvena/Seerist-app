// @include _shared
// ============================================================================
// creem-checkout — Billing via Creem, Merchant of Record (NOT Stripe).
//
// Creem is the legal seller: it collects payment, registers and remits VAT/GST
// /sales tax in 190+ countries, and absorbs chargeback liability. Seerist never
// touches card data.
//
// The plan ladder lives in the `billing_plans` table (code, price, interval,
// creem_product_id, features, limits) so pricing is data, not code. The webhook
// counterpart (creem-webhook) applies subscription events to
// organizations.billing_status / plan.
//
// Operations (POST { op, ... }):
//   plans          { }                              the public plan ladder
//   checkout       { organization_id, plan, ... }   hosted Creem checkout URL
//   portal         { organization_id }              self-service billing portal
//   subscription   { organization_id }              current subscription state
// ============================================================================

const CREEM_LIVE = 'https://api.creem.io';
const CREEM_TEST = 'https://test-api.creem.io';

/** Test and live are entirely separate; the key prefix decides which. */
function creemBase(key: string): string {
  const override = Deno.env.get('CREEM_BASE_URL');
  if (override) return override;
  return key.startsWith('creem_test_') ? CREEM_TEST : CREEM_LIVE;
}

async function creem(path: string, key: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${creemBase(key)}${path}`, {
    ...init,
    headers: { 'x-api-key': key, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.message) ? data.message.join('; ') : (data.message || JSON.stringify(data).slice(0, 300));
    throw new Error(`Creem ${path} failed (${res.status}): ${detail}`);
  }
  return data;
}

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const token = bearer(req);
  if (!token) return json({ error: 'Sign in required' }, 401);
  const userId = userIdFromToken(token);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Back-compat: the original contract was { organization_id, plan } with no op.
  const op = String(body.op || body.action || (body.organization_id ? 'checkout' : 'plans'));

  try {
    if (op === 'plans') return await listPlans(token);

    const { organization_id } = body;
    if (!organization_id) return json({ error: 'organization_id is required' }, 400);

    const org = (await dbSelect('organizations', `id=eq.${organization_id}&limit=1`, token))[0];
    if (!org) return json({ error: 'Organization not found or not a member' }, 404);

    if (op === 'subscription') {
      const plan = (await dbSelect('billing_plans', `code=eq.${encodeURIComponent(org.plan || 'free')}&limit=1`, token))[0];
      return json({
        plan: org.plan,
        billing_status: org.billing_status,
        plan_interval: org.plan_interval ?? null,
        current_period_end: org.current_period_end ?? null,
        creem_customer_id: org.creem_customer_id ?? null,
        creem_subscription_id: org.creem_subscription_id ?? null,
        details: plan ?? null,
        lifetime: org.plan === 'lifetime_founder',
      });
    }

    const key = Deno.env.get('CREEM_API_KEY');
    if (!key) {
      return json({
        error: 'Creem is not configured yet. Add the CREEM_API_KEY project secret (and CREEM_WEBHOOK_SECRET) to enable billing.',
        setupNeeded: true,
      }, 501);
    }

    if (op === 'portal') {
      if (!org.creem_customer_id) {
        return json({
          error: 'No Creem customer for this organization yet — the billing portal opens after your first payment.',
          setupNeeded: true,
        }, 424);
      }
      const data = await creem('/v1/customers/billing', key, {
        method: 'POST',
        body: JSON.stringify({ customer_id: org.creem_customer_id }),
      });
      return json({ portalUrl: data.customer_portal_link || data.url || data.link || null });
    }

    if (op !== 'checkout') {
      return json({ error: 'op must be one of: plans, checkout, portal, subscription' }, 400);
    }

    if (org.plan === 'lifetime_founder') {
      return json({ error: 'This organization has a lifetime founder grant — there is nothing to pay for.' }, 409);
    }

    const planCode = String(body.plan || 'builder');
    const plan = (await dbSelect('billing_plans', `code=eq.${encodeURIComponent(planCode)}&active=is.true&limit=1`, token))[0];
    if (!plan) return json({ error: `Unknown plan "${planCode}".` }, 400);
    if (!plan.is_paid) return json({ error: 'The free plan needs no checkout — it is already available.' }, 400);
    if (!plan.creem_product_id) {
      return json({ error: `Plan "${planCode}" has no Creem product id configured.`, setupNeeded: true }, 501);
    }

    // referenceId maps the payment back to the org when the webhook arrives.
    const data = await creem('/v1/checkouts', key, {
      method: 'POST',
      body: JSON.stringify({
        product_id: plan.creem_product_id,
        request_id: organization_id,
        success_url: body.success_url || undefined,
        discount_code: body.discount_code || undefined,
        customer: body.email ? { email: String(body.email) } : undefined,
        metadata: {
          organization_id,
          plan: plan.code,
          interval: plan.interval,
          requested_by: userId,
          referenceId: organization_id,
        },
      }),
    });

    await logPersona({
      organization_id,
      persona: 'System',
      action: 'checkout_created',
      params: { plan: plan.code, product_id: plan.creem_product_id },
      result: `Creem checkout opened for the ${plan.name} plan.`,
      created_by: userId,
    }, token);

    return json({
      checkoutUrl: data.checkout_url || data.url,
      checkoutId: data.id,
      plan: plan.code,
      priceCents: plan.price_cents,
      interval: plan.interval,
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'billing request failed' }, 502);
  }
}

async function listPlans(token: string): Promise<Response> {
  const plans = await dbSelect('billing_plans', 'active=is.true&order=rank.asc,price_cents.asc&limit=50', token);
  return json({
    plans,
    // Creem is the Merchant of Record, so its buyer terms apply to every
    // purchase alongside Seerist's own policies.
    legal: {
      terms: 'https://seerist.xyz/terms',
      privacy: 'https://seerist.xyz/privacy',
      refunds: 'https://seerist.xyz/refunds',
      cookies: 'https://seerist.xyz/cookies',
      merchant_of_record: 'https://creem.io/legal/buyer-terms',
    },
    merchantOfRecord: 'Payments are processed by Creem, our Merchant of Record. Creem is the seller of record, handles VAT/GST/sales tax in 190+ countries, and appears on your statement.',
  });
}
