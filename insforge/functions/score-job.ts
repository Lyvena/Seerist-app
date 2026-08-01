// @include _shared
// ============================================================================
// score-job — Module A AI fit scoring via the InsForge model gateway.
// Scores a captured job against the workspace's ideal-client profile and
// ALWAYS returns plain-language reasoning — never a bare number.
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
    const proposal = (await dbSelect('proposals', `id=eq.${proposal_id}&limit=1`, token))[0];
    if (!proposal) return json({ error: 'Proposal not found' }, 404);

    const job = (await dbSelect('job_postings', `id=eq.${proposal.job_posting_id}&limit=1`, token))[0];
    const ws = (await dbSelect('workspaces', `id=eq.${proposal.workspace_id}&limit=1`, token))[0];
    if (!job || !ws) return json({ error: 'Job or workspace not found' }, 404);

    const system = `You are The Scout, Seerist's job-fit analyst for ${ws.type === 'saas' ? 'a SaaS company using freelance platforms as a growth channel' : 'a services agency'}.
Score how well a job posting fits this workspace. Consider: skill match, budget sanity, client quality signals (payment verified, hire rate, spend), scope clarity, and red flags.
Respond with STRICT JSON only: {"score": <integer 0-100>, "reasoning": "<3-6 plain-language sentences explaining why this fits or doesn't — specific, no fluff>"}`;

    const user = `WORKSPACE PROFILE
Name: ${ws.name}
Type: ${ws.type}
Description: ${ws.description || '(none)'}
Ideal client profile: ${ws.ideal_client_profile || '(not set — score conservatively and say so)'}
${ws.type === 'saas' ? `Product: ${ws.product_name || ''} — ${ws.product_description || ''}\nTarget customer: ${ws.target_customer || ''}` : `Portfolio highlights: ${ws.portfolio || '(none)'}`}

JOB POSTING (${job.platform}, captured ${job.captured_at})
Title: ${job.title}
Budget: ${job.budget || 'not stated'}
Client stats: ${JSON.stringify(job.client_stats || {})}
Description:
${(job.description || '').slice(0, 6000)}`;

    const raw = await aiChat(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      token,
      { maxTokens: 700, temperature: 0.2, scope: { workspace_id: proposal.workspace_id, function_slug: 'score-job' } },
    );
    const parsed = parseJsonLoose(raw);
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const reasoning = String(parsed.reasoning || '').trim();
    if (!reasoning) throw new Error('Scoring model returned no reasoning — refusing to store a bare number.');

    const nextStatus = proposal.status === 'new' ? 'scored' : proposal.status;
    const [updated] = await dbPatch('proposals', `id=eq.${proposal_id}`, {
      fit_score: score,
      fit_reasoning: reasoning,
      status: nextStatus,
    }, token);

    if (proposal.status === 'new') {
      await logStatusChange(proposal_id, 'new', 'scored', userId, `Fit score ${score}/100`, token);
    }
    await logPersona({
      workspace_id: proposal.workspace_id,
      persona: 'The Scout',
      action: 'score_job',
      params: { proposal_id, score },
      result: reasoning.slice(0, 500),
      created_by: userId,
    }, token);

    return json({ proposal: updated, score, reasoning });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'scoring failed' }, 500);
  }
}
