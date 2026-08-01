#!/usr/bin/env node
/**
 * Live end-to-end check for the three capabilities added on 2026-08-01:
 * discovery (email intake + bulk capture pipeline), the learning loop
 * (outcome reasons feeding drafting and scoring), and the automation heartbeat.
 *
 * Runs against the deployed backend with a throwaway user, exactly as a
 * customer would. The admin key is used only to create and confirm that user.
 *
 * Usage:
 *   INSFORGE_BASE_URL=... INSFORGE_API_KEY=ik_... node insforge/scripts/e2e-discovery.mjs
 */
const BASE = process.env.INSFORGE_BASE_URL;
const ADMIN = process.env.INSFORGE_API_KEY;
if (!BASE || !ADMIN) { console.error('Set INSFORGE_BASE_URL and INSFORGE_API_KEY'); process.exit(1); }

const EMAIL = process.env.E2E_EMAIL || `disc-${Date.now()}@seerist.xyz`;
const PASSWORD = 'Seerist-e2e-1234';

let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name} — ${detail}`); }
}

async function api(path, opts = {}, token) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}
const fn = (slug, payload, token) => api(`/functions/${slug}`, { method: 'POST', body: JSON.stringify(payload) }, token);
const rec = {
  insert: (t, rows, token) => api(`/api/database/records/${t}`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(rows) }, token),
  select: (t, q, token) => api(`/api/database/records/${t}?${q}`, {}, token),
  update: (t, q, patch, token) => api(`/api/database/records/${t}?${q}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) }, token),
};

console.log(`\n=== Discovery / learning / automation E2E against ${BASE} ===\n`);

// --- Setup -------------------------------------------------------------------
await api('/api/auth/users', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: 'E2E', autoConfirm: true }) }, ADMIN);
const token = (await api('/api/auth/sessions', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) })).body.accessToken;
const userId = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub;
await rec.insert('profiles', [{ id: userId, email: EMAIL, name: 'E2E' }], token);
const org = (await rec.insert('organizations', [{ name: 'Discovery Org', created_by: userId }], token)).body[0];
await rec.insert('organization_memberships', [{ organization_id: org.id, user_id: userId, role: 'owner' }], token);
const ws = (await rec.insert('workspaces', [{
  organization_id: org.id, type: 'saas', name: 'Discovery WS', created_by: userId,
  product_name: 'AcmeBoard', product_description: 'Real-time BI dashboards', product_url: 'https://acmeboard.example.com',
  ideal_client_profile: 'Funded B2B SaaS', portfolio: 'Analytics for X', tone_style: 'direct, warm',
  bidding_enabled: true, risk_acknowledged_at: new Date().toISOString(),
}], token)).body[0];
await rec.insert('workspace_memberships', [{ workspace_id: ws.id, user_id: userId, role: 'owner' }], token);
await rec.insert('platform_connections', [{ workspace_id: ws.id, platform: 'upwork' }], token);

// --- 1. Discovery: every new workspace can receive mail ----------------------
check('a new workspace gets an intake address automatically', Boolean(ws.intake_token), JSON.stringify(ws.intake_token));
check('automation defaults to on, with a sensible alert threshold', ws.automation_enabled === true && ws.alert_min_score === 75, `enabled=${ws.automation_enabled} min=${ws.alert_min_score}`);

const ALERT_EMAIL = `
Upwork
New jobs matching "React dashboard"

Build a real-time analytics dashboard for our SaaS
Fixed price: $8,000 — Payment method verified — 85% hire rate
We need a collaborative real-time dashboard with charts, filters and CSV export.
https://www.upwork.com/jobs/~01alpha?utm_source=alert

Senior React engineer for a design-system rebuild
Hourly: $60 - $90 — Payment method verified
Rebuild our component library in React with tokens and Storybook coverage.
https://www.upwork.com/jobs/~01beta?utm_source=alert

Manage your job alerts | Unsubscribe | Upwork Global Inc.
`;

const ingest = await fn('ingest-job-email', { workspace_id: ws.id, subject: 'New jobs matching "React dashboard"', text: ALERT_EMAIL }, token);
check('a forwarded job-alert email becomes real jobs', ingest.status === 201 && ingest.body.ingested >= 2, `${ingest.status} ${JSON.stringify(ingest.body).slice(0, 180)}`);

const ingestedJobs = (await rec.select('job_postings', `workspace_id=eq.${ws.id}&source=eq.email_alert&select=id,title,url,budget`, token)).body;
check('jobs are tagged as email_alert, not passed off as extension captures', ingestedJobs.length >= 2, `${ingestedJobs.length}`);
check('tracking parameters are stripped from the link', ingestedJobs.every((j) => !String(j.url || '').includes('utm_')), JSON.stringify(ingestedJobs.map((j) => j.url)));

const again = await fn('ingest-job-email', { workspace_id: ws.id, subject: 'same alert again', text: ALERT_EMAIL }, token);
check('forwarding the same alert twice does not duplicate the jobs', again.body.ingested === 0 && again.body.duplicates >= 2, JSON.stringify(again.body).slice(0, 160));

const badToken = await fn('ingest-job-email', { to: 'jobs+deadbeefdeadbeef@inbound.seerist.xyz', text: ALERT_EMAIL, subject: 'x' }, token);
check('an unknown intake token is refused', badToken.status === 404, `got ${badToken.status}`);

// --- 2. Automation: the heartbeat ------------------------------------------
const scan = await fn('automation-tick', { job: 'scan', workspace_id: ws.id }, token);
const scanResult = scan.body?.results?.[0];
check('the scan job scores what arrived', scan.status === 200 && scanResult?.status === 'ok', JSON.stringify(scan.body).slice(0, 200));

const scored = (await rec.select('proposals', `workspace_id=eq.${ws.id}&status=eq.scored&select=id,fit_score`, token)).body;
check('scanned jobs come back with a real fit score', scored.length >= 1 && scored.every((p) => typeof p.fit_score === 'number'), `${scored.length} scored`);

const runs = (await rec.select('automation_runs', `workspace_id=eq.${ws.id}&select=job,status,items&order=created_at.desc`, token)).body;
check('every tick is recorded, so a job that stops running is visible', runs.some((r) => r.job === 'scan'), JSON.stringify(runs).slice(0, 160));

await rec.update('workspaces', `id=eq.${ws.id}`, { automation_enabled: false }, token);
const paused = await fn('automation-tick', { job: 'scan', workspace_id: ws.id }, token);
check('a paused workspace is skipped entirely', paused.body?.results?.[0]?.status === 'skipped', JSON.stringify(paused.body?.results?.[0] || {}).slice(0, 160));
await rec.update('workspaces', `id=eq.${ws.id}`, { automation_enabled: true }, token);

const badJob = await fn('automation-tick', { job: 'delete-everything', workspace_id: ws.id }, token);
check('an unknown job name is refused', badJob.status === 400, `got ${badJob.status}`);

const nudge = await fn('automation-tick', { job: 'nudge', workspace_id: ws.id }, token);
check('the nudge job runs and finds nothing to chase yet', nudge.status === 200 && nudge.body?.results?.[0]?.status === 'skipped', JSON.stringify(nudge.body?.results?.[0] || {}).slice(0, 140));

// --- 3. Learning: outcomes teach the next proposal ---------------------------
// Resolve a set of past bids so there is a history to learn from.
const history = [
  ['Real-time analytics dashboard build', 'won', null, 88],
  ['Dashboard rebuild for a fintech', 'won', null, 84],
  ['Webflow to Next.js migration', 'lost', 'price', 71],
  ['Shopify headless storefront', 'lost', 'competitor', 64],
  ['Internal admin panel', 'lost', 'price', 58],
  ['BigQuery data pipeline', 'won', null, 81],
  ['Marketing site refresh', 'lost', 'timing', 55],
  ['Stripe billing integration', 'won', null, 86],
  ['React Native MVP', 'lost', 'price', 62],
];
for (const [title, outcome, category, score] of history) {
  const job = (await rec.insert('job_postings', [{
    workspace_id: ws.id, source: 'manual', platform: 'upwork', title,
    description: 'A past contract, used to give the workspace a real bidding history.',
    budget: '$7,500', url: `https://www.upwork.com/jobs/~hist${Math.random().toString(36).slice(2, 10)}`,
  }], token)).body[0];
  const now = new Date().toISOString();
  await rec.insert('proposals', [{
    workspace_id: ws.id, job_posting_id: job.id, status: 'submitted', mode: 'saas',
    fit_score: score, fit_reasoning: 'historic',
    draft_content: `Winning angle for "${title}": opened on the client's own metric, named the first milestone, asked one question.`,
    outcome, outcome_category: category, outcome_reason: category ? 'Recorded during the E2E run.' : null,
    submitted_at: now, viewed_at: now, won_at: outcome === 'won' ? now : null, lost_at: outcome === 'lost' ? now : null,
  }], token);
}

const target = scored[0];
const draft = await fn('draft-proposal', { proposal_id: target.id }, token);
check('drafting still works with a bidding history in context', draft.status === 200 && String(draft.body.draft || '').length > 120, JSON.stringify(draft.body).slice(0, 180));

const rescore = await fn('score-job', { proposal_id: target.id }, token);
check('scoring calibrates against the workspace’s real outcomes', rescore.status === 200 && rescore.body.calibration?.sample >= 8, JSON.stringify(rescore.body.calibration || {}).slice(0, 200));
check('calibration reports conversion by score band', Array.isArray(rescore.body.calibration?.by_band) && rescore.body.calibration.by_band.length > 0, JSON.stringify(rescore.body.calibration?.by_band || []).slice(0, 160));

const analytics = await fn('analytics-summary', { workspace_id: ws.id }, token);
const learning = analytics.body?.learning;
check('analytics surfaces what was learned', analytics.status === 200 && learning?.ready === true, JSON.stringify(learning || {}).slice(0, 200));
check('it reports why bids were lost', Array.isArray(learning?.lossReasons) && learning.lossReasons.some((r) => r.reason === 'price'), JSON.stringify(learning?.lossReasons || []).slice(0, 160));
check('it reports win rate by score band', Array.isArray(learning?.byScoreBand) && learning.byScoreBand.length > 0, JSON.stringify(learning?.byScoreBand || []).slice(0, 160));

// A brand-new workspace must not be told a statistic that does not exist yet.
const freshWs = (await rec.insert('workspaces', [{
  organization_id: org.id, type: 'agency', name: 'Fresh WS', created_by: userId, bidding_enabled: true,
}], token)).body[0];
await rec.insert('workspace_memberships', [{ workspace_id: freshWs.id, user_id: userId, role: 'owner' }], token);
const freshAnalytics = await fn('analytics-summary', { workspace_id: freshWs.id }, token);
check('a workspace with no history is told so, not given a made-up number',
  freshAnalytics.body?.learning?.ready === false && typeof freshAnalytics.body.learning.note === 'string',
  JSON.stringify(freshAnalytics.body?.learning || {}).slice(0, 160));

// --- 4. Boundaries hold ------------------------------------------------------
const killed = (await rec.select('platform_connections', `workspace_id=eq.${ws.id}&platform=eq.upwork&select=id`, token)).body[0];
await rec.update('platform_connections', `id=eq.${killed.id}`, { kill_switch: true }, token);
const afterKill = await fn('ingest-job-email', { workspace_id: ws.id, subject: 'more jobs', text: ALERT_EMAIL.replace(/01alpha|01beta/g, (m) => m + 'x') }, token);
check('the platform kill switch stops email intake too', afterKill.status === 423, `got ${afterKill.status}`);
await rec.update('platform_connections', `id=eq.${killed.id}`, { kill_switch: false }, token);

const outsiderEmail = `outsider-${Date.now()}@seerist.xyz`;
await api('/api/auth/users', { method: 'POST', body: JSON.stringify({ email: outsiderEmail, password: PASSWORD, name: 'Out', autoConfirm: true }) }, ADMIN);
const outsider = (await api('/api/auth/sessions', { method: 'POST', body: JSON.stringify({ email: outsiderEmail, password: PASSWORD }) })).body.accessToken;
const leak = await rec.select('automation_runs', `workspace_id=eq.${ws.id}&select=id`, outsider);
check('automation history is not readable by an outsider', Array.isArray(leak.body) && leak.body.length === 0, JSON.stringify(leak.body).slice(0, 120));

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
process.exit(failed ? 1 : 0);
