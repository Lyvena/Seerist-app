// @include _shared
// ============================================================================
// record-outcome — Module A post-submission funnel: viewed / replied / won /
// lost. 'won' is what hands off to Module B (delivery run trigger is a
// separate explicit call — human-in-the-loop, per spec).
// ============================================================================

const OUTCOMES = ['viewed', 'replied', 'won', 'lost'];

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
  const { proposal_id, outcome } = body;
  if (!proposal_id || !OUTCOMES.includes(outcome)) {
    return json({ error: `proposal_id and outcome (${OUTCOMES.join('|')}) are required` }, 400);
  }

  try {
    const proposal = (await dbSelect('proposals', `id=eq.${proposal_id}&limit=1`, token))[0];
    if (!proposal) return json({ error: 'Proposal not found' }, 404);
    if (proposal.status !== 'submitted') {
      return json({ error: 'Outcomes can only be recorded on submitted proposals' }, 422);
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { outcome };
    if (outcome === 'viewed' && !proposal.viewed_at) patch.viewed_at = now;
    if (outcome === 'replied') {
      patch.replied_at = proposal.replied_at || now;
      if (!proposal.viewed_at) patch.viewed_at = now;
    }
    if (outcome === 'won') {
      patch.won_at = now;
      if (!proposal.replied_at) patch.replied_at = now;
      if (!proposal.viewed_at) patch.viewed_at = now;
    }
    if (outcome === 'lost') patch.lost_at = now;

    const [updated] = await dbPatch('proposals', `id=eq.${proposal_id}`, patch, token);
    await logStatusChange(proposal_id, 'submitted', `outcome:${outcome}`, userId, null, token);

    return json({
      proposal: updated,
      next: outcome === 'won'
        ? 'Contract won — you can now trigger a delivery run (Module B) from the proposal page.'
        : null,
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'outcome update failed' }, 500);
  }
}
