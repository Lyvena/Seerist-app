// @include _shared
// ============================================================================
// creem-checkout — Billing (Creem, Merchant of Record — NOT Stripe).
// Creates a Creem checkout session for an organization's plan upgrade.
// Requires project secrets: CREEM_API_KEY and CREEM_PRODUCT_<PLAN> product
// ids (e.g. CREEM_PRODUCT_STARTER, CREEM_PRODUCT_GROWTH). The webhook
// counterpart (creem-webhook) processes subscription events against
// organizations.billing_status.
// ============================================================================

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
  const { organization_id, plan = 'growth', success_url } = body;
  if (!organization_id) return json({ error: 'organization_id is required' }, 400);

  try {
    const org = (await dbSelect('organizations', `id=eq.${organization_id}&limit=1`, token))[0];
    if (!org) return json({ error: 'Organization not found or not a member' }, 404);

    const creemKey = Deno.env.get('CREEM_API_KEY');
    if (!creemKey) {
      return json({
        error: 'Creem is not configured yet. Add the CREEM_API_KEY project secret (plus CREEM_PRODUCT_* product ids and CREEM_WEBHOOK_SECRET) to enable billing. The webhook endpoint to register in the Creem dashboard is /functions/creem-webhook.',
        setupNeeded: true,
      }, 501);
    }

    const productEnv = `CREEM_PRODUCT_${String(plan).toUpperCase()}`;
    const productId = Deno.env.get(productEnv);
    if (!productId) {
      return json({ error: `No Creem product configured for plan "${plan}" (missing ${productEnv} secret).`, setupNeeded: true }, 501);
    }

    const creemBase = Deno.env.get('CREEM_BASE_URL') ?? 'https://api.creem.io';
    const res = await fetch(`${creemBase}/v1/checkouts`, {
      method: 'POST',
      headers: { 'x-api-key': creemKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        request_id: organization_id,
        success_url: success_url || undefined,
        metadata: { organization_id, plan, requested_by: userId },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ error: `Creem checkout failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}` }, 502);
    }

    return json({ checkoutUrl: data.checkout_url || data.url, checkoutId: data.id, plan });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'checkout failed' }, 500);
  }
}
