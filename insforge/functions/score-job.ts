// @include _shared
// ============================================================================
// score-job — Module A AI fit scoring via the InsForge model gateway.
// Scores a captured job against the workspace's ideal-client profile and
// ALWAYS returns plain-language reasoning — never a bare number.
//
// The scoring itself lives in `scoreProposal` in _shared, because the scheduled
// scan needs it too and this platform forbids a function from calling another
// over HTTP (Deno Deploy answers 508 Loop Detected). One implementation, two
// entry points, no drift.
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
  const { proposal_id } = body;
  if (!proposal_id) return json({ error: 'proposal_id is required' }, 400);

  try {
    const result = await scoreProposal(proposal_id, token, userId);
    if ('error' in result) return json({ error: result.error }, result.status);
    return json(result);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'scoring failed' }, 500);
  }
}
