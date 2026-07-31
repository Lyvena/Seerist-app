// @include _shared
// ============================================================================
// track-signup — Module C attribution loop (public endpoint). A SaaS
// workspace's product signup page calls this with ?ref=<proposal_id> (the
// Seerist attribution ref carried in bid touchpoints) so signups get
// attributed back to the specific bid that generated them.
// ============================================================================

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { workspace_id, email, ref } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);

  try {
    // Public endpoint — writes with the service role, validates targets exist.
    const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&select=id&limit=1`, SERVICE_KEY))[0];
    if (!ws) return json({ error: 'Unknown workspace' }, 404);

    let touchpoint: any = null;
    let proposalId: string | null = null;
    // `ref` is a proposal id for bid touchpoints and a touchpoint id for ad /
    // site touchpoints — one attribution model, two ways of naming the entry
    // point. A malformed ref is ignored rather than failing the signup.
    if (ref && isUuid(String(ref))) {
      const byProposal = await dbSelect(
        'growth_touchpoints',
        `proposal_id=eq.${ref}&workspace_id=eq.${workspace_id}&limit=1`,
        SERVICE_KEY,
      );
      touchpoint = byProposal[0] || null;
      if (!touchpoint) {
        const byId = await dbSelect(
          'growth_touchpoints',
          `id=eq.${ref}&workspace_id=eq.${workspace_id}&limit=1`,
          SERVICE_KEY,
        );
        touchpoint = byId[0] || null;
      }
      if (touchpoint) proposalId = touchpoint.proposal_id ?? null;
    }

    const [signup] = await dbInsert('product_signups', [{
      workspace_id,
      email: email ? String(email).slice(0, 320) : null,
      source: touchpoint ? 'bid_touchpoint' : 'organic',
      touchpoint_id: touchpoint?.id ?? null,
      proposal_id: proposalId,
    }], SERVICE_KEY);

    if (touchpoint && !touchpoint.attributed_signup_id) {
      await dbPatch('growth_touchpoints', `id=eq.${touchpoint.id}`, {
        attributed_signup_id: signup.id,
        attributed_at: new Date().toISOString(),
      }, SERVICE_KEY);

      // A fresh attribution changes what the segment data says, so the Grower
      // re-reads it immediately. Best-effort: the signup is already recorded
      // and must never fail because the analysis did.
      await invokeFunction(
        'growth-feedback',
        { workspace_id, op: 'analyze', automatic: true },
        SERVICE_KEY,
      );
    }

    return json({ ok: true, attributed: Boolean(touchpoint) }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'signup tracking failed' }, 500);
  }
}
