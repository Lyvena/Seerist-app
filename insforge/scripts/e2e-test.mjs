#!/usr/bin/env node
/**
 * Seerist end-to-end smoke test against the LIVE InsForge backend.
 * Exercises the full path: tenancy bootstrap → capture → score → draft →
 * approve → submit → outcome → delivery run → QA gate → growth attribution →
 * personas (PM + CEO bounded autonomy) → analytics.
 *
 * Usage:
 *   INSFORGE_BASE_URL=... INSFORGE_API_KEY=ik_... [E2E_EMAIL=..] [E2E_PASSWORD=..] \
 *   node insforge/scripts/e2e-test.mjs
 *
 * The admin key is used ONLY to create/confirm the disposable test user; all
 * product actions run with the test user's own JWT (RLS enforced).
 */
const BASE = process.env.INSFORGE_BASE_URL;
const ADMIN = process.env.INSFORGE_API_KEY;
if (!BASE || !ADMIN) { console.error('Set INSFORGE_BASE_URL and INSFORGE_API_KEY'); process.exit(1); }

const EMAIL = process.env.E2E_EMAIL || `e2e-${Date.now()}@seerist.xyz`;
const PASSWORD = process.env.E2E_PASSWORD || 'Seerist-e2e-1234';

let passed = 0, failed = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
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

console.log(`\n=== Seerist E2E against ${BASE} as ${EMAIL} ===\n`);

// --- 0. User + session ------------------------------------------------------
await api('/api/auth/users', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: 'E2E', autoConfirm: true }) }, ADMIN);
const session = await api('/api/auth/sessions', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
const token = session.body.accessToken;
check('sign in returns access token', Boolean(token));
const userId = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub;

// --- 1. Tenancy bootstrap ----------------------------------------------------
const prof = await rec.insert('profiles', [{ id: userId, email: EMAIL, name: 'E2E' }], token);
check('profile insert (RLS self-write)', prof.status === 201 || prof.status === 200, JSON.stringify(prof.body).slice(0, 120));

const org = (await rec.insert('organizations', [{ name: 'E2E Org', created_by: userId }], token)).body[0];
check('organization created', Boolean(org?.id));
const om = await rec.insert('organization_memberships', [{ organization_id: org.id, user_id: userId, role: 'owner' }], token);
check('owner membership (bootstrap policy)', om.status === 201 || om.status === 200, JSON.stringify(om.body).slice(0, 120));

const ws = (await rec.insert('workspaces', [{
  organization_id: org.id, type: 'saas', name: 'E2E SaaS WS', created_by: userId,
  ideal_client_profile: 'Funded B2B SaaS, $5k+ budget, payment verified',
  portfolio: 'Built analytics for X; shipped Y mobile app',
  tone_style: 'direct, warm',
  product_name: 'AcmeBoard', product_description: 'Real-time BI dashboards non-technical teams build themselves',
  product_url: 'https://acmeboard.example.com', target_customer: 'Ops leads at 20-200 person companies',
}], token)).body[0];
check('workspace created', Boolean(ws?.id));
await rec.insert('workspace_memberships', [{ workspace_id: ws.id, user_id: userId, role: 'owner' }], token);
await rec.insert('platform_connections', [{ workspace_id: ws.id, platform: 'upwork' }], token);
await rec.insert('workspace_memories', [{ workspace_id: ws.id, key: 'default_delivery_stack_rule', kind: 'decision_rule', content: 'InstantDB for real-time/client-heavy; InsForge for fuller server-side. Overridable.' }], token);

// bidding disabled → capture must be refused
const blocked = await fn('capture-job', { workspace_id: ws.id, title: 'Should be blocked' }, token);
check('capture refused while bidding disabled (423)', blocked.status === 423, `got ${blocked.status}`);

await rec.update('workspaces', `id=eq.${ws.id}`, { bidding_enabled: true, risk_acknowledged_at: new Date().toISOString() }, token);

// --- 2. Module A: capture → score → draft → approve → submit ----------------
const cap = await fn('capture-job', {
  workspace_id: ws.id,
  title: 'Build a real-time analytics dashboard for our SaaS',
  description: 'We need a collaborative real-time dashboard with charts, filters, and CSV export. Budget is flexible for the right team. Payment verified, 85% hire rate.',
  budget: '$8,000 fixed', url: 'https://www.upwork.com/jobs/~test', source: 'extension_capture',
  client_stats: { payment_verified: true, hire_rate: '85%' },
}, token);
const proposalId = cap.body?.proposal?.id;
check('capture-job creates job + proposal(new)', cap.status === 201 && Boolean(proposalId), JSON.stringify(cap.body).slice(0, 150));

const score = await fn('score-job', { proposal_id: proposalId }, token);
check('score-job returns 0-100 + reasoning', score.status === 200 && typeof score.body.score === 'number' && (score.body.reasoning || '').length > 30, JSON.stringify(score.body).slice(0, 150));

const draft = await fn('draft-proposal', { proposal_id: proposalId }, token);
const draftText = draft.body?.draft || '';
check('draft-proposal returns a draft', draft.status === 200 && draftText.length > 100, JSON.stringify(draft.body).slice(0, 150));
check('SaaS policy applied is description_only (curated upwork row)', draft.body?.mention_policy === 'description_only', `got ${draft.body?.mention_policy}`);
check('description_only draft contains NO product URL', !draftText.includes('acmeboard.example.com'), 'URL leaked into draft');

const badMove = await fn('update-proposal-status', { proposal_id: proposalId, to_status: 'submitted' }, token);
check('invalid Kanban transition rejected (drafted→submitted)', badMove.status === 422, `got ${badMove.status}`);

const approve = await fn('update-proposal-status', { proposal_id: proposalId, to_status: 'approved' }, token);
check('drafted → approved', approve.status === 200 && approve.body.proposal?.status === 'approved');
const submit = await fn('update-proposal-status', { proposal_id: proposalId, to_status: 'submitted' }, token);
check('approved → submitted (human click recorded)', submit.status === 200 && Boolean(submit.body.proposal?.submitted_at));

const won = await fn('record-outcome', { proposal_id: proposalId, outcome: 'won' }, token);
check('outcome recorded: won', won.status === 200 && won.body.proposal?.outcome === 'won');

// --- 3. Module B: delivery + mandatory QA gate --------------------------------
const run = await fn('trigger-delivery-run', { proposal_id: proposalId }, token);
const runId = run.body?.run?.id;
check('trigger-delivery-run decomposes tasks', run.status === 201 && (run.body?.tasks || []).length >= 3, JSON.stringify(run.body).slice(0, 150));
check('stack decision has reasoning', (run.body?.run?.stack_reasoning || '').length > 10);

const tasks = (await rec.select('delivery_tasks', `delivery_run_id=eq.${runId}&order=position.asc`, token)).body;
const gateEarly = await fn('complete-delivery-run', { run_id: runId }, token);
check('QA gate blocks delivery before any QA (422)', gateEarly.status === 422, `got ${gateEarly.status}`);

const exec = await fn('execute-delivery-task', { task_id: tasks[0].id }, token);
check('execute-delivery-task → qa_pending with output', exec.status === 200 && exec.body.task?.status === 'qa_pending' && (exec.body.task?.agent_output || '').length > 50);

const qa = await fn('qa-task', { task_id: tasks[0].id, approve: true, note: 'looks good' }, token);
check('human QA approve works', qa.status === 200 && qa.body.task?.status === 'qa_approved');

const gateStill = await fn('complete-delivery-run', { run_id: runId }, token);
check('QA gate still blocks with remaining unapproved tasks', gateStill.status === 422, `got ${gateStill.status}`);

// --- 4. Module C: growth ------------------------------------------------------
const tps = (await rec.select('growth_touchpoints', `workspace_id=eq.${ws.id}`, token)).body;
check('product-mention draft created a growth touchpoint', tps.length >= 1);

const signup = await fn('track-signup', { workspace_id: ws.id, email: 'newuser@example.com', ref: proposalId });
check('public track-signup attributes to the bid', signup.status === 201 && signup.body.attributed === true, JSON.stringify(signup.body).slice(0, 120));

const dsync = await fn('deploy-sync', { workspace_id: ws.id, deploy_ref: 'v1.0.0-e2e', change_summary: 'Added SSO login and renamed /v1/reports to /v2/reports' }, token);
check('deploy-sync creates draft-only docs/site updates', dsync.status === 201 && (dsync.body.draft?.docs_draft || '').length > 50 && dsync.body.draft?.status === 'draft');

// --- 5. Module D: personas ----------------------------------------------------
const pm = await fn('pm-insights', { workspace_id: ws.id }, token);
check('The PM produces roadmap insights', pm.status === 200 && (pm.body.insights || '').length > 100);

const closer = await fn('closer-draft', { proposal_id: proposalId, purpose: 'kickoff' }, token);
check('The Closer drafts a kickoff email', closer.status === 200 && (closer.body.subject || '').length > 3 && (closer.body.body || '').length > 50);

const ceoDisabled = await fn('ceo-command', { organization_id: org.id, instruction: 'Give me a cross-workspace summary' }, token);
check('CEO refuses when not enabled (423)', ceoDisabled.status === 423, `got ${ceoDisabled.status}`);

await rec.update('organizations', `id=eq.${org.id}`, { ceo_enabled: true }, token);
const ceoOk = await fn('ceo-command', { organization_id: org.id, instruction: 'Summarize how our workspaces are performing and what stands out.' }, token);
check('CEO executes allowed action (surface_insights)', ceoOk.status === 200 && ceoOk.body.executed === true && ceoOk.body.actionType === 'surface_insights', JSON.stringify({ s: ceoOk.status, t: ceoOk.body.actionType }).slice(0, 120));

const ceoMoney = await fn('ceo-command', { organization_id: org.id, instruction: 'Upgrade our plan to the most expensive tier and increase all our Upwork bid budgets by 50%.' }, token);
check('CEO blocks monetary action → pending approval', ceoMoney.status === 200 && ceoMoney.body.executed === false && ceoMoney.body.requiresApproval === true, JSON.stringify({ t: ceoMoney.body.actionType }).slice(0, 120));

await rec.update('organizations', `id=eq.${org.id}`, { ceo_kill_switch: true }, token);
const ceoKilled = await fn('ceo-command', { organization_id: org.id, instruction: 'anything' }, token);
check('CEO kill switch halts everything (423)', ceoKilled.status === 423, `got ${ceoKilled.status}`);

const log = (await rec.select('persona_action_log', `organization_id=eq.${org.id}&order=created_at.desc&limit=20`, token)).body;
check('persona audit log populated (org level)', log.length >= 2);

// --- 6. Billing + analytics ----------------------------------------------------
// Billing is live, so an unknown plan code must be rejected on its own merits
// rather than hidden behind a "Creem is not configured" response.
const badPlan = await fn('creem-checkout', { organization_id: org.id, plan: 'growth' }, token);
check('creem-checkout rejects an unknown plan code', badPlan.status === 400 && /unknown plan/i.test(badPlan.body.error || ''), `got ${badPlan.status} ${JSON.stringify(badPlan.body).slice(0, 120)}`);

const plans = await fn('creem-checkout', { op: 'plans' }, token);
const planCodes = (plans.body.plans || []).map((p) => p.code);
check('creem-checkout lists the plan ladder', plans.status === 200 && ['free', 'starter', 'builder', 'scale'].every((c) => planCodes.includes(c)), `got ${JSON.stringify(planCodes).slice(0, 160)}`);

const analytics = await fn('analytics-summary', { workspace_id: ws.id }, token);
check('analytics: 1 sent / 1 won / mention stats present', analytics.status === 200 && analytics.body.funnel?.sent === 1 && analytics.body.funnel?.won === 1 && analytics.body.productMention !== null, JSON.stringify(analytics.body.funnel || {}).slice(0, 120));
check('analytics: attribution counted', analytics.body.growth?.attributedSignups === 1, JSON.stringify(analytics.body.growth || {}));

// --- 7. RLS isolation: a second user must see nothing -------------------------
const EMAIL2 = `e2e2-${Date.now()}@seerist.xyz`;
await api('/api/auth/users', { method: 'POST', body: JSON.stringify({ email: EMAIL2, password: PASSWORD, autoConfirm: true }) }, ADMIN);
const s2 = await api('/api/auth/sessions', { method: 'POST', body: JSON.stringify({ email: EMAIL2, password: PASSWORD }) });
const stranger = (await rec.select('proposals', `workspace_id=eq.${ws.id}`, s2.body.accessToken)).body;
check('RLS: outsider sees zero proposals from our workspace', Array.isArray(stranger) && stranger.length === 0, JSON.stringify(stranger).slice(0, 100));
const strangerOrg = (await rec.select('organizations', `id=eq.${org.id}`, s2.body.accessToken)).body;
check('RLS: outsider sees zero organizations', strangerOrg.length === 0);

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
process.exit(failed ? 1 : 0);
