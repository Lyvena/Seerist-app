// @include _shared
// ============================================================================
// update-proposal-status — Module A review-queue Kanban transitions.
// New → Scored → Drafted → Needs edits → Approved → Submitted.
// 'submitted' means the HUMAN clicked submit on the platform (recorded here);
// Seerist never submits anything itself.
// ============================================================================

const TRANSITIONS: Record<string, string[]> = {
  new: ['scored'],
  scored: ['drafted'],
  drafted: ['needs_edits', 'approved'],
  needs_edits: ['drafted', 'approved'],
  approved: ['needs_edits', 'submitted'],
  submitted: [],
};

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
  const { proposal_id, to_status, note, draft_content } = body;
  if (!proposal_id || !to_status) return json({ error: 'proposal_id and to_status are required' }, 400);

  try {
    const proposal = (await dbSelect('proposals', `id=eq.${proposal_id}&limit=1`, token))[0];
    if (!proposal) return json({ error: 'Proposal not found' }, 404);

    const allowed = TRANSITIONS[proposal.status] ?? [];
    if (!allowed.includes(to_status)) {
      return json({
        error: `Invalid transition ${proposal.status} → ${to_status}. Allowed: ${allowed.join(', ') || '(none — pipeline ends at submitted)'}`,
      }, 422);
    }

    const patch: Record<string, unknown> = { status: to_status };
    if (typeof draft_content === 'string') patch.draft_content = draft_content;
    if (to_status === 'submitted') patch.submitted_at = new Date().toISOString();

    const [updated] = await dbPatch('proposals', `id=eq.${proposal_id}`, patch, token);
    await logStatusChange(proposal_id, proposal.status, to_status, userId, note || null, token);

    return json({ proposal: updated });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'status update failed' }, 500);
  }
}
