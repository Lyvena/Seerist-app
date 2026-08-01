// @include _shared
// ============================================================================
// automation-tick — the heartbeat. Until this existed nothing in Seerist ran
// unless a human clicked it, which made "AI employees" a set of buttons rather
// than a workforce. InsForge cron schedules call this with ?job=<name>.
//
// Jobs:
//   scan    score whatever arrived, and alert on the ones worth a bid
//   nudge   a bid that was VIEWED but never replied to is a warm lead going
//           cold; tell the owner. Never messages the client — an external
//           communication is exactly what spec §12 reserves for a human click.
//   stale   delivery runs stuck in one state, especially waiting on human QA
//
// The weekly digest and the weekly Grower run are scheduled directly against
// pm-insights and growth-feedback instead of being orchestrated from here: a
// function on this platform cannot call another over HTTP (Deno Deploy answers
// 508 Loop Detected), so each of those iterates its own workspaces.
//
// Rules every job obeys, because autonomy without limits is a liability:
//   - a workspace with automation_enabled = false is skipped entirely
//   - bidding_enabled and the per-platform kill switch still apply
//   - plan entitlements still apply (no Growth work for a plan without it)
//   - every model call passes `scope`, so the monthly AI cap is enforced the
//     same way it is for a human-triggered call and a cron can never quietly
//     burn a customer's allowance
//   - every action is written to persona_action_log, and every tick to
//     automation_runs, so nothing autonomous is invisible
//   - work per tick is bounded, so one busy workspace cannot starve the rest
//     or blow the request budget
//
// Auth: ?token=<AUTOMATION_TOKEN> project secret, or a signed-in member
// running one by hand from Settings.
// ============================================================================

/** Bounded work per tick — the edge request budget is ~30s. */
const MAX_WORKSPACES = 12;
const MAX_SCORES = 5;
const MAX_NUDGES = 8;

const JOBS = ['scan', 'nudge', 'stale'] as const;
type Job = typeof JOBS[number];

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'POST or GET' }, 405);

  const url = new URL(req.url);
  const expected = Deno.env.get('AUTOMATION_TOKEN');
  // The scheduler sends the token in the Authorization header, because InsForge
  // substitutes ${{secrets.KEY}} into headers and not into URLs.
  const supplied = url.searchParams.get('token') || bearer(req);
  const viaCron = Boolean(expected && supplied && supplied === expected);
  const userToken = viaCron ? null : bearer(req);
  if (!viaCron && !userToken) return json({ error: 'Sign in or provide a valid automation token' }, 401);

  let body: any = {};
  if (req.method === 'POST') body = await req.json().catch(() => ({}));

  const job = String(url.searchParams.get('job') || body.job || 'scan') as Job;
  if (!JOBS.includes(job)) {
    return json({ error: `job must be one of: ${JOBS.join(', ')}` }, 400);
  }
  // A member running a job by hand only ever runs it for their own workspace;
  // the cron runs it for everyone.
  const onlyWorkspace = body.workspace_id ? String(body.workspace_id) : null;
  if (!viaCron && !onlyWorkspace) {
    return json({ error: 'workspace_id is required when running a job by hand' }, 400);
  }

  try {
    const filter = onlyWorkspace
      ? `id=eq.${onlyWorkspace}&limit=1`
      : `automation_enabled=is.true&order=updated_at.desc&limit=${MAX_WORKSPACES}`;
    // A by-hand run acts as the person who asked for it — including the lookup,
    // so RLS decides whether that workspace is theirs to run. Only the cron
    // acts with the service role, and only it sees every workspace.
    const actAs = viaCron ? SERVICE_KEY : userToken!;
    const workspaces = await dbSelect('workspaces', filter, actAs);
    if (!workspaces.length) return json({ job, workspaces: 0, results: [] });
    for (const ws of workspaces) ws._token = actAs;

    const results: any[] = [];
    for (const ws of workspaces) {
      if (!ws.automation_enabled) {
        results.push({ workspace_id: ws.id, status: 'skipped', detail: 'Automation is paused for this workspace.' });
        continue;
      }
      try {
        const r = await runJob(job, ws);
        results.push({ workspace_id: ws.id, ...r });
        await recordRun(ws.id, job, r.status, r.detail, r.items ?? 0, SERVICE_KEY);
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        results.push({ workspace_id: ws.id, status: 'failed', detail });
        await recordRun(ws.id, job, 'failed', detail, 0, SERVICE_KEY);
      }
    }
    return json({ job, workspaces: workspaces.length, results });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'automation tick failed' }, 500);
  }
}

type JobResult = { status: 'ok' | 'skipped' | 'failed'; detail: string; items?: number };

async function runJob(job: Job, ws: any): Promise<JobResult> {
  if (job === 'scan') return await scan(ws);
  if (job === 'nudge') return await nudge(ws);
  return await stale(ws);
}

// --- scan: score what arrived, surface what is worth bidding on --------------

async function scan(ws: any): Promise<JobResult> {
  if (!ws.bidding_enabled) return { status: 'skipped', detail: 'Bidding is not enabled.' };

  const pending = await dbSelect(
    'proposals',
    `workspace_id=eq.${ws.id}&status=eq.new&order=created_at.asc&limit=${MAX_SCORES}`,
    SERVICE_KEY,
  );
  if (!pending.length) return { status: 'skipped', detail: 'Nothing new to score.', items: 0 };

  // Scored in parallel: five sequential model calls would not fit the request
  // budget, five concurrent ones take as long as the slowest.
  const scored = await Promise.allSettled(
    pending.map((p: any) => scoreProposal(p.id, ws._token, null)),
  );
  const ok = scored.filter((r) => r.status === 'fulfilled' && !('error' in r.value)).length;
  // Never report "scored 0" without saying why — a silent zero is the failure
  // mode that makes scheduled work impossible to trust.
  if (!ok) {
    const first = scored[0];
    const why = first?.status === 'rejected'
      ? String(first.reason).slice(0, 200)
      : String((first?.value as any)?.error ?? 'unknown');
    return { status: 'failed', detail: `Could not score ${pending.length} job(s): ${why}`, items: 0 };
  }

  // Alert on the ones that clear the workspace's own bar.
  const threshold = Number(ws.alert_min_score ?? 75);
  const worth = await dbSelect(
    'proposals',
    `workspace_id=eq.${ws.id}&status=eq.scored&fit_score=gte.${threshold}&order=fit_score.desc&limit=5`,
    SERVICE_KEY,
  );
  let alerted = 0;
  if (worth.length && ws.alert_channel) {
    const jobs = await dbSelect(
      'job_postings',
      `id=in.(${worth.map((p: any) => p.job_posting_id).join(',')})&select=id,title,platform,budget,url`,
      SERVICE_KEY,
    );
    const byId = new Map(jobs.map((j: any) => [j.id, j]));
    const lines = worth.map((p: any) => {
      const j: any = byId.get(p.job_posting_id);
      return `• ${p.fit_score}/100 — ${j?.title ?? 'a job'} (${j?.platform ?? '?'}${j?.budget ? `, ${j.budget}` : ''})${j?.url ? `\n  ${j.url}` : ''}`;
    });
    const sent = await sendAlert(
      ws.alert_channel,
      `Seerist found ${worth.length} job${worth.length === 1 ? '' : 's'} worth a look in ${ws.name}:\n\n${lines.join('\n')}\n\nDraft and review them in your Pitch Queue.`,
      ws.alert_target || null,
    );
    if (sent.sent) alerted = worth.length;
  }

  await logPersona({
    workspace_id: ws.id,
    persona: 'The Scout',
    action: 'auto_scan',
    params: { scored: ok, alerted },
    result: `Scored ${ok} new job${ok === 1 ? '' : 's'}${alerted ? `, alerted on ${alerted} above ${threshold}` : ''}.`,
    created_by: null,
  }, SERVICE_KEY);

  return { status: 'ok', detail: `Scored ${ok}, alerted ${alerted}.`, items: ok };
}

// --- nudge: a viewed bid with no reply is a warm lead going cold -------------

async function nudge(ws: any): Promise<JobResult> {
  const cutoff = new Date(Date.now() - 3 * 86400000).toISOString();
  const cold = await dbSelect(
    'proposals',
    `workspace_id=eq.${ws.id}&outcome=eq.viewed&viewed_at=lt.${cutoff}&follow_up_nudged_at=is.null` +
      `&order=viewed_at.asc&limit=${MAX_NUDGES}`,
    SERVICE_KEY,
  );
  if (!cold.length) return { status: 'skipped', detail: 'No bids waiting on a follow-up.', items: 0 };

  const jobs = await dbSelect(
    'job_postings',
    `id=in.(${cold.map((p: any) => p.job_posting_id).join(',')})&select=id,title,platform`,
    SERVICE_KEY,
  );
  const byId = new Map(jobs.map((j: any) => [j.id, j]));
  const lines = cold.map((p: any) => {
    const j: any = byId.get(p.job_posting_id);
    const days = Math.floor((Date.now() - new Date(p.viewed_at).getTime()) / 86400000);
    return `• ${j?.title ?? 'a bid'} (${j?.platform ?? '?'}) — viewed ${days} day${days === 1 ? '' : 's'} ago, no reply`;
  });

  if (ws.alert_channel) {
    await sendAlert(
      ws.alert_channel,
      `${cold.length} bid${cold.length === 1 ? '' : 's'} in ${ws.name} were read but never answered:\n\n${lines.join('\n')}\n\nA short follow-up on the platform is usually what turns these. Seerist will not message the client for you.`,
      ws.alert_target || null,
    );
  }

  // Marked whether or not a channel is configured, so the queue does not
  // re-nudge the same bids forever; the Pitch Queue shows them either way.
  for (const p of cold) {
    await dbPatch('proposals', `id=eq.${p.id}`, { follow_up_nudged_at: new Date().toISOString() }, SERVICE_KEY);
  }

  await logPersona({
    workspace_id: ws.id,
    persona: 'The Closer',
    action: 'follow_up_nudge',
    params: { proposals: cold.length },
    result: `Flagged ${cold.length} viewed-but-unanswered bid${cold.length === 1 ? '' : 's'}.`,
    created_by: null,
  }, SERVICE_KEY);

  return { status: 'ok', detail: `Flagged ${cold.length} cold bid(s).`, items: cold.length };
}

// --- stale: work that has stopped moving -------------------------------------

async function stale(ws: any): Promise<JobResult> {
  const cutoff = new Date(Date.now() - 3 * 86400000).toISOString();
  const stuck = await dbSelect(
    'delivery_runs',
    `workspace_id=eq.${ws.id}&status=not.in.(delivered,cancelled)&updated_at=lt.${cutoff}&order=updated_at.asc&limit=10`,
    SERVICE_KEY,
  );
  if (!stuck.length) return { status: 'skipped', detail: 'Every delivery run is moving.', items: 0 };

  const lines = stuck.map((r: any) => {
    const days = Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 86400000);
    return `• run ${String(r.id).slice(0, 8)} — ${r.status} for ${days} day${days === 1 ? '' : 's'}`;
  });
  if (ws.alert_channel) {
    await sendAlert(
      ws.alert_channel,
      `${stuck.length} delivery run${stuck.length === 1 ? '' : 's'} in ${ws.name} have not moved in 3 days:\n\n${lines.join('\n')}\n\nRuns waiting on QA need your approval to continue.`,
      ws.alert_target || null,
    );
  }
  await logPersona({
    workspace_id: ws.id,
    persona: 'The Builder',
    action: 'stale_run_alert',
    params: { runs: stuck.length },
    result: `${stuck.length} run(s) stalled for 3+ days.`,
    created_by: null,
  }, SERVICE_KEY);
  return { status: 'ok', detail: `${stuck.length} stalled run(s).`, items: stuck.length };
}
