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
      `workspace_id=eq.${workspace_id}&select=id,status,outcome,product_mentioned,fit_score,submitted_at,created_at&limit=5000`,
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
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'analytics failed' }, 500);
  }
}
