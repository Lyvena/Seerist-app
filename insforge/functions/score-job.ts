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

    // What this workspace's own history says about jobs like this one. A score
    // with no grounding in real outcomes is an unanchored opinion; once there
    // are enough resolved bids it becomes a calibrated one.
    const history = await outcomeHistory(proposal.workspace_id, job.platform, token);

    const parsed = await aiJson(
      [
        { role: 'system', content: system + history.systemNote },
        { role: 'user', content: user + history.userBlock },
      ],
      token,
      { maxTokens: 700, temperature: 0.2, scope: { workspace_id: proposal.workspace_id, function_slug: 'score-job' } },
    );
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

    return json({ proposal: updated, score, reasoning, calibration: history.summary });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'scoring failed' }, 500);
  }
}

/** Below this a "win rate" is noise dressed up as a number. */
const MIN_SAMPLE = 8;

/**
 * The workspace's real hit rate, so the score means something.
 *
 * Deliberately silent until there are enough resolved bids to say anything
 * honest — inventing a conversion rate from three data points would be worse
 * than saying nothing, and the first-run experience must not change.
 */
async function outcomeHistory(
  workspaceId: string,
  platform: string,
  token: string,
): Promise<{ systemNote: string; userBlock: string; summary: any }> {
  const quiet = { systemNote: '', userBlock: '', summary: null };
  try {
    const resolved = await dbSelect(
      'proposals',
      `workspace_id=eq.${workspaceId}&outcome=in.(won,lost)&fit_score=not.is.null` +
        `&select=fit_score,outcome,outcome_category&order=updated_at.desc&limit=200`,
      token,
    );
    if (resolved.length < MIN_SAMPLE) return quiet;

    const wins = resolved.filter((p: any) => p.outcome === 'won').length;
    const rate = Math.round((wins / resolved.length) * 100);

    // Conversion by score band — this is what tells the model whether its own
    // 85s have been meaning anything.
    const bands = [[80, 100], [60, 79], [0, 59]] as const;
    const byBand = bands.map(([lo, hi]) => {
      const inBand = resolved.filter((p: any) => p.fit_score >= lo && p.fit_score <= hi);
      const won = inBand.filter((p: any) => p.outcome === 'won').length;
      return {
        band: `${lo}-${hi}`,
        n: inBand.length,
        won,
        rate: inBand.length ? Math.round((won / inBand.length) * 100) : null,
      };
    }).filter((b) => b.n > 0);

    const reasons = tally(
      resolved.filter((p: any) => p.outcome === 'lost' && p.outcome_category)
        .map((p: any) => p.outcome_category),
    );
    const topReasons = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const summary = { sample: resolved.length, win_rate: rate, by_band: byBand, top_loss_reasons: topReasons };
    return {
      systemNote:
        '\nThis workspace has a real bidding history, given below. Calibrate against it: if jobs in a score band have rarely converted, score a similar job lower, and say what would have to be true for it to score higher.',
      userBlock: `\n\nTHIS WORKSPACE'S HISTORY (${resolved.length} resolved bids on all platforms, current platform ${platform})
Overall win rate: ${rate}%
By score band: ${byBand.map((b) => `${b.band} → ${b.rate}% of ${b.n}`).join('; ')}
${topReasons.length ? `Most common loss reasons: ${topReasons.map(([r, n]) => `${r} (${n})`).join(', ')}` : ''}`,
      summary,
    };
  } catch {
    return quiet;
  }
}

function tally(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] || 0) + 1;
  return out;
}
