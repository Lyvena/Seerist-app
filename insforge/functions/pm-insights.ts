// @include _shared
// ============================================================================
// pm-insights — Module D, The PM. Read-only synthesis over proposals (win/loss
// by platform), delivery_runs (QA rejection rate by target_stack) and
// growth_touchpoints (attribution), producing roadmap suggestions. It has no
// write access to any other module, by design.
//
// Two entry points:
//   POST { workspace_id }         one workspace, on request
//   POST ?token=<AUTOMATION_TOKEN>  the weekly digest, every workspace that
//                                   left automation on, delivered to its channel
//
// The cron path lives here rather than in an orchestrator because a function on
// this platform cannot call another over HTTP — Deno Deploy answers 508 Loop
// Detected — so each per-workspace job iterates its own workspaces.
// ============================================================================

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  // The scheduler authenticates with the automation token in the Authorization
  // header (InsForge substitutes ${{secrets.KEY}} into headers, not URLs); the
  // ?token= form stays supported for calling it by hand.
  const expected = Deno.env.get('AUTOMATION_TOKEN');
  const supplied = new URL(req.url).searchParams.get('token') || bearer(req);
  const viaCron = Boolean(expected && supplied && supplied === expected);

  const token = viaCron ? SERVICE_KEY : bearer(req);
  if (!token) return json({ error: 'Sign in required' }, 401);
  const userId = viaCron ? null : userIdFromToken(token);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    if (!viaCron) return json({ error: 'Invalid JSON body' }, 400);
  }

  // --- Weekly digest, for everyone -----------------------------------------
  if (viaCron && !body.workspace_id) {
    const workspaces = await dbSelect(
      'workspaces',
      'automation_enabled=is.true&order=updated_at.desc&limit=12',
      SERVICE_KEY,
    );
    const results: any[] = [];
    for (const ws of workspaces) {
      try {
        const { insights } = await synthesise(ws.id, SERVICE_KEY, null);
        if (ws.alert_channel && insights) {
          await sendAlert(
            ws.alert_channel,
            `The PM's weekly read on ${ws.name}:\n\n${insights.slice(0, 3000)}`,
            ws.alert_target || null,
          );
        }
        await recordRun(ws.id, 'digest', 'ok', 'Weekly digest generated.', 1, SERVICE_KEY);
        results.push({ workspace_id: ws.id, status: 'ok' });
      } catch (e) {
        // One workspace failing must not end the run for the rest.
        const detail = e instanceof Error ? e.message : String(e);
        await recordRun(ws.id, 'digest', 'failed', detail, 0, SERVICE_KEY);
        results.push({ workspace_id: ws.id, status: 'failed', detail });
      }
    }
    return json({ job: 'digest', workspaces: results.length, results });
  }

  // --- One workspace, on request -------------------------------------------
  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);

  try {
    return json(await synthesise(workspace_id, token, userId));
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'PM insights failed' }, 500);
  }
}

/** The PM's read on one workspace. Shared by both entry points above. */
async function synthesise(
  workspace_id: string,
  token: string,
  userId: string | null,
): Promise<{ insights: string }> {
  const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
  if (!ws) throw new Error('Workspace not found or not a member');

  const proposals = await dbSelect(
    'proposals',
    `workspace_id=eq.${workspace_id}&select=status,outcome,outcome_category,fit_score,fit_reasoning,product_mentioned,submitted_at&order=created_at.desc&limit=200`,
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
Recorded loss reasons: ${JSON.stringify(count(lost.map((p: any) => p.outcome_category).filter(Boolean)))}
DELIVERY: ${runs.length} runs (${runs.filter((r: any) => r.status === 'delivered').length} delivered); stacks: ${JSON.stringify(count(runs.map((r: any) => r.target_stack)))}
QA REJECTIONS (${rejectedTasks.length}): ${rejectedTasks.slice(0, 8).map((t: any) => t.qa_note?.slice(0, 120)).join(' | ') || '(none)'}
ATTRIBUTION: ${touchpoints.length} product-mention touchpoints, ${touchpoints.filter((t: any) => t.attributed_signup_id).length} attributed signups`;

  const insights = await aiChat([
    { role: 'system', content: `You are The PM, Seerist's product-manager persona for the "${ws.name}" ${ws.type} workspace. Synthesize win/loss, QA-rejection, and attribution data into concrete roadmap suggestions. Output markdown with three sections: "What's working", "What's costing us", and "Roadmap suggestions" (3-5 prioritized, specific items). If data is thin, say so plainly and suggest what to instrument.` },
    { role: 'user', content: dataBrief },
  ], token, { maxTokens: 1200, temperature: 0.4, scope: { workspace_id, function_slug: 'pm-insights' } });

  await logPersona({
    workspace_id,
    persona: 'The PM',
    action: 'roadmap_insights',
    params: { proposals: proposals.length, runs: runs.length, qa_rejections: rejectedTasks.length },
    result: insights.slice(0, 400),
    created_by: userId,
  }, token);

  return { insights };
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
