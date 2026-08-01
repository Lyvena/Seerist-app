// @include _shared
// ============================================================================
// analytics-summary — Module A analytics: sent / viewed / replied / won, plus
// SaaS-workspace product-mention stats tracked separately from win rate, and
// Module C attribution counts (signups attributed to bid touchpoints).
// ============================================================================

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const token = bearer(req);
  if (!token) return json({ error: 'Sign in required' }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);

  try {
    const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
    if (!ws) return json({ error: 'Workspace not found or not a member' }, 404);

    const proposals = await dbSelect(
      'proposals',
      `workspace_id=eq.${workspace_id}&select=id,job_posting_id,status,outcome,outcome_category,product_mentioned,mention_policy_applied,fit_score,submitted_at,created_at&limit=5000`,
      token,
    );

    const byStatus: Record<string, number> = {};
    for (const p of proposals) byStatus[p.status] = (byStatus[p.status] || 0) + 1;

    const sent = proposals.filter((p: any) => p.status === 'submitted');
    const viewed = sent.filter((p: any) => ['viewed', 'replied', 'won'].includes(p.outcome));
    const replied = sent.filter((p: any) => ['replied', 'won'].includes(p.outcome));
    const won = sent.filter((p: any) => p.outcome === 'won');
    const lost = sent.filter((p: any) => p.outcome === 'lost');

    const mentioned = proposals.filter((p: any) => p.product_mentioned);
    const mentionedSent = sent.filter((p: any) => p.product_mentioned);
    const mentionedWon = won.filter((p: any) => p.product_mentioned);

    const scores = proposals.map((p: any) => p.fit_score).filter((s: any) => typeof s === 'number');
    const avgFit = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;

    const touchpoints = await dbSelect(
      'growth_touchpoints',
      `workspace_id=eq.${workspace_id}&select=id,attributed_signup_id&limit=5000`,
      token,
    );
    const signups = await dbSelect(
      'product_signups',
      `workspace_id=eq.${workspace_id}&select=id&limit=5000`,
      token,
    );

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

    return json({
      workspace: { id: ws.id, name: ws.name, type: ws.type },
      pipeline: byStatus,
      totalCaptured: proposals.length,
      averageFitScore: avgFit,
      funnel: {
        sent: sent.length,
        viewed: viewed.length,
        replied: replied.length,
        won: won.length,
        lost: lost.length,
        viewRate: pct(viewed.length, sent.length),
        replyRate: pct(replied.length, sent.length),
        winRate: pct(won.length, sent.length),
      },
      productMention: ws.type === 'saas' ? {
        draftedWithMention: mentioned.length,
        sentWithMention: mentionedSent.length,
        wonWithMention: mentionedWon.length,
        mentionShareOfSent: pct(mentionedSent.length, sent.length),
      } : null,
      growth: {
        touchpoints: touchpoints.length,
        attributedSignups: touchpoints.filter((t: any) => t.attributed_signup_id).length,
        totalSignups: signups.length,
      },
      learning: await learnings(proposals, workspace_id, token),
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'analytics failed' }, 500);
  }
}

/** Below this, a percentage is noise with a decimal point. */
const MIN_SAMPLE = 8;

/**
 * What the workspace's own results say — the same evidence the scorer and the
 * drafter now read, shown to the human so they can see the product learning
 * rather than take it on faith.
 *
 * Returns `ready: false` with a plain explanation until the sample is real.
 */
async function learnings(proposals: any[], workspaceId: string, token: string) {
  const resolved = proposals.filter((p: any) => p.outcome === 'won' || p.outcome === 'lost');
  if (resolved.length < MIN_SAMPLE) {
    return {
      ready: false,
      resolved: resolved.length,
      needed: MIN_SAMPLE,
      note: `Seerist starts calibrating on your own results at ${MIN_SAMPLE} resolved bids — ${resolved.length} so far. Recording why a bid was won or lost is what teaches it.`,
    };
  }

  const rate = (rows: any[]) => {
    const won = rows.filter((p: any) => p.outcome === 'won').length;
    return rows.length ? Math.round((won / rows.length) * 100) : null;
  };

  const bands = [[80, 100], [60, 79], [0, 59]] as const;
  const byBand = bands.map(([lo, hi]) => {
    const rows = resolved.filter((p: any) => typeof p.fit_score === 'number' && p.fit_score >= lo && p.fit_score <= hi);
    return { band: `${lo}–${hi}`, n: rows.length, winRate: rate(rows) };
  }).filter((b) => b.n > 0);

  const lossReasons = Object.entries(
    resolved.filter((p: any) => p.outcome === 'lost' && p.outcome_category)
      .reduce((acc: Record<string, number>, p: any) => {
        acc[p.outcome_category] = (acc[p.outcome_category] || 0) + 1;
        return acc;
      }, {}),
  ).map(([reason, count]) => ({ reason, count: count as number }))
    .sort((a, b) => b.count - a.count);

  // Does mentioning the product actually cost us the contract? A SaaS
  // workspace is trading two outcomes off against each other and deserves the
  // real number rather than a hunch.
  const withMention = resolved.filter((p: any) => p.product_mentioned);
  const withoutMention = resolved.filter((p: any) => !p.product_mentioned);

  let byPlatform: Array<{ platform: string; n: number; winRate: number | null }> = [];
  try {
    const jobs = await dbSelect(
      'job_postings',
      `workspace_id=eq.${workspaceId}&select=id,platform&limit=5000`,
      token,
    );
    const platformOf = new Map(jobs.map((j: any) => [j.id, j.platform]));
    const groups: Record<string, any[]> = {};
    for (const p of resolved) {
      const key = String(platformOf.get(p.job_posting_id) || 'unknown');
      (groups[key] ||= []).push(p);
    }
    byPlatform = Object.entries(groups)
      .map(([platform, rows]) => ({ platform, n: rows.length, winRate: rate(rows) }))
      .sort((a, b) => b.n - a.n);
  } catch { /* platform breakdown is a nice-to-have, not the point */ }

  return {
    ready: true,
    resolved: resolved.length,
    overallWinRate: rate(resolved),
    byScoreBand: byBand,
    byPlatform,
    lossReasons,
    productMention: withMention.length && withoutMention.length
      ? { withWinRate: rate(withMention), withoutWinRate: rate(withoutMention), withN: withMention.length, withoutN: withoutMention.length }
      : null,
    note: 'These are your own results. The Scout now calibrates its fit scores against them, and The Drafter writes from the proposals that actually won.',
  };
}
