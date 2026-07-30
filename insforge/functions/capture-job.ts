// @include _shared
// ============================================================================
// capture-job — Module A ingestion (extension-capture first; API polling is a
// later, additive JobSource). Creates a job_postings row + a proposals row in
// status 'new'. Compliance: refuses when bidding is disabled or the platform
// kill switch is on.
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

  const { workspace_id, title, description, budget, client_stats, url } = body;
  const platform = (body.platform || 'upwork').toLowerCase();
  const source = ['extension_capture', 'api_poll', 'manual'].includes(body.source)
    ? body.source
    : 'extension_capture';

  if (!workspace_id || !title) {
    return json({ error: 'workspace_id and title are required' }, 400);
  }

  try {
    const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
    if (!ws) return json({ error: 'Workspace not found or not a member' }, 404);
    if (!ws.bidding_enabled) {
      return json({
        error: 'Bidding is not enabled for this workspace. Complete onboarding and acknowledge the risk disclosure first.',
      }, 423);
    }

    // Per-platform emergency kill switch (spec §4 compliance guardrails).
    const conns = await dbSelect(
      'platform_connections',
      `workspace_id=eq.${workspace_id}&platform=eq.${encodeURIComponent(platform)}&limit=1`,
      token,
    );
    if (conns[0]?.kill_switch) {
      return json({
        error: `The ${platform} kill switch is active for this workspace. Capture is halted until an admin re-enables it.`,
      }, 423);
    }

    const [job] = await dbInsert('job_postings', [{
      workspace_id,
      source,
      platform,
      title: String(title).slice(0, 500),
      description: description ? String(description).slice(0, 20000) : null,
      budget: budget ? String(budget).slice(0, 200) : null,
      client_stats: client_stats ?? null,
      url: url ? String(url).slice(0, 2000) : null,
      captured_by: userId,
    }], token);

    const [proposal] = await dbInsert('proposals', [{
      workspace_id,
      job_posting_id: job.id,
      status: 'new',
      mode: ws.type === 'saas' ? 'saas' : 'agency',
    }], token);

    await logStatusChange(proposal.id, null, 'new', userId, `Captured via ${source}`, token);
    await logPersona({
      workspace_id,
      persona: 'The Scout',
      action: 'capture_job',
      params: { job_posting_id: job.id, proposal_id: proposal.id, source, platform },
      result: `Captured "${job.title}"`,
      created_by: userId,
    }, token);

    return json({ jobPosting: job, proposal }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'capture failed' }, 500);
  }
}
