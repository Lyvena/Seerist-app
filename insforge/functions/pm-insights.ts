// @include _shared
// ============================================================================
// pm-insights — Module D, The PM. Synthesizes win/loss data, QA-rejection
// patterns, and attribution data into roadmap suggestions. Uses existing data
// only — no new backend state beyond the persona audit log.
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
  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);

  try {
    const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
    if (!ws) return json({ error: 'Workspace not found or not a member' }, 404);

    const proposals = await dbSelect(
      'proposals',
      `workspace_id=eq.${workspace_id}&select=status,outcome,fit_score,fit_reasoning,product_mentioned,submitted_at&order=created_at.desc&limit=200`,
      token,
    );
    const runs = await dbSelect(
      'delivery_runs',
      `workspace_id=eq.${workspace_id}&select=id,status,target_stack&limit=100`,
      token,
    );
    const rejectedTasks = await dbSelect(
      'delivery_tasks',
      `status=eq.qa_rejected&select=description,qa_note,delivery_run_id&limit=100`,
      token,
    );
    const touchpoints = await dbSelect(
      'growth_touchpoints',
      `workspace_id=eq.${workspace_id}&select=product_mentioned,attributed_signup_id&limit=500`,
      token,
    );

    const won = proposals.filter((p: any) => p.outcome === 'won');
    const lost = proposals.filter((p: any) => p.outcome === 'lost');
    const dataBrief = `
PROPOSALS (${proposals.length} recent): won ${won.length}, lost ${lost.length}, avg fit of won: ${avg(won.map((p: any) => p.fit_score))}, avg fit of lost: ${avg(lost.map((p: any) => p.fit_score))}
Won reasoning samples: ${won.slice(0, 5).map((p: any) => p.fit_reasoning?.slice(0, 150)).join(' | ') || '(none)'}
Lost reasoning samples: ${lost.slice(0, 5).map((p: any) => p.fit_reasoning?.slice(0, 150)).join(' | ') || '(none)'}
DELIVERY: ${runs.length} runs (${runs.filter((r: any) => r.status === 'delivered').length} delivered); stacks: ${JSON.stringify(count(runs.map((r: any) => r.target_stack)))}
QA REJECTIONS (${rejectedTasks.length}): ${rejectedTasks.slice(0, 8).map((t: any) => t.qa_note?.slice(0, 120)).join(' | ') || '(none)'}
ATTRIBUTION: ${touchpoints.length} product-mention touchpoints, ${touchpoints.filter((t: any) => t.attributed_signup_id).length} attributed signups`;

    const insights = await aiChat([
      { role: 'system', content: `You are The PM, Seerist's product-manager persona for the "${ws.name}" ${ws.type} workspace. Synthesize win/loss, QA-rejection, and attribution data into concrete roadmap suggestions. Output markdown with three sections: "What's working", "What's costing us", and "Roadmap suggestions" (3-5 prioritized, specific items). If data is thin, say so plainly and suggest what to instrument.` },
      { role: 'user', content: dataBrief },
    ], token, { maxTokens: 1200, temperature: 0.4 });

    await logPersona({
      workspace_id,
      persona: 'The PM',
      action: 'roadmap_insights',
      params: { proposals: proposals.length, runs: runs.length, qa_rejections: rejectedTasks.length },
      result: insights.slice(0, 400),
      created_by: userId,
    }, token);

    return json({ insights });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'PM insights failed' }, 500);
  }
}

function avg(nums: any[]): string {
  const v = nums.filter((n) => typeof n === 'number');
  return v.length ? String(Math.round(v.reduce((a, b) => a + b, 0) / v.length)) : 'n/a';
}
function count(items: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[i] = (out[i] || 0) + 1;
  return out;
}
