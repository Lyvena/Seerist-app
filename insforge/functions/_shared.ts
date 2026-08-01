// ============================================================================
// Seerist shared edge-function helpers.
// This block is inlined into every function at deploy time by
// insforge/scripts/deploy-functions.mjs (functions must be self-contained).
// ============================================================================

const IF_BASE = Deno.env.get('INSFORGE_BASE_URL') ?? 'https://si9f4zab.eu-central.insforge.app';
const SERVICE_KEY = Deno.env.get('SERVICE_API_KEY') ?? '';
const DEFAULT_MODEL = Deno.env.get('SEERIST_MODEL') ?? 'openai/gpt-4o-mini';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  return null;
}

function bearer(req: Request): string | null {
  const h = req.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function userIdFromToken(token: string): string | null {
  try {
    const p = token.split('.')[1];
    const pad = p + '='.repeat((4 - (p.length % 4)) % 4);
    const claims = JSON.parse(atob(pad.replace(/-/g, '+').replace(/_/g, '/')));
    return claims.sub ?? null;
  } catch {
    return null;
  }
}

// --- InsForge records API (PostgREST) ---------------------------------------

async function dbSelect(
  table: string,
  query: string,
  token: string,
): Promise<any[]> {
  const res = await fetch(`${IF_BASE}/api/database/records/${table}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`select ${table} failed (${res.status}): ${await res.text()}`);
  return await res.json();
}

async function dbInsert(table: string, rows: unknown[], token: string): Promise<any[]> {
  const res = await fetch(`${IF_BASE}/api/database/records/${table}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`insert ${table} failed (${res.status}): ${await res.text()}`);
  return await res.json();
}

async function dbPatch(
  table: string,
  query: string,
  patch: Record<string, unknown>,
  token: string,
): Promise<any[]> {
  const res = await fetch(`${IF_BASE}/api/database/records/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`update ${table} failed (${res.status}): ${await res.text()}`);
  return await res.json();
}

async function dbDelete(table: string, query: string, token: string): Promise<void> {
  const res = await fetch(`${IF_BASE}/api/database/records/${table}?${query}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`delete ${table} failed (${res.status}): ${await res.text()}`);
}

/*
 * There is deliberately no "call another Seerist function" helper.
 *
 * Deno Deploy refuses a deployment that fetches itself (508 Loop Detected), so
 * an internal HTTP hop always fails — silently, if the caller does not inspect
 * the status. Work that more than one function needs lives here instead
 * (scoreProposal, sendAlert), and per-workspace jobs iterate their own
 * workspaces rather than being orchestrated from a single function.
 */

/** Exact row count without pulling the rows (PostgREST Content-Range). */
async function dbCount(table: string, query: string, token: string): Promise<number> {
  const res = await fetch(`${IF_BASE}/api/database/records/${table}?${query}&select=id`, {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'count=exact', Range: '0-0' },
  });
  if (!res.ok) throw new Error(`count ${table} failed (${res.status})`);
  const range = res.headers.get('content-range') || '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

// --- Model tiering ----------------------------------------------------------
// Free plans may ONLY use zero-cost gateway models; paid plans get the best
// model available and can override it. Which model is "best" is resolved
// against the LIVE gateway catalog every time, so when a better model appears
// it becomes the default on its own — no code change, no redeploy.

// Used when the catalog cannot be read at all, so it has to be a model that
// answers well within the edge timeout rather than the most capable one.
const FREE_FALLBACK_MODEL = Deno.env.get('SEERIST_FREE_MODEL') ?? 'inclusionai/ling-3.0-flash:free';
const PAID_FALLBACK_MODEL = Deno.env.get('SEERIST_PAID_MODEL') ?? 'anthropic/claude-opus-5';

interface GatewayModel {
  id: string;
  inputPrice?: number;
  outputPrice?: number;
  inputModality?: string[];
  outputModality?: string[];
}

let _catalog: { at: number; models: GatewayModel[] } | null = null;

/**
 * The gateway's live model list, cached briefly per isolate.
 *
 * Read with the project's service key, not the caller's JWT: the catalog
 * endpoint is admin-only and the list is project-wide rather than tenant data.
 * A caller's token gets a 403 here, which silently pins every tier to its
 * hardcoded fallback and defeats model selection entirely.
 */
async function gatewayModels(token: string): Promise<GatewayModel[]> {
  if (_catalog && Date.now() - _catalog.at < 300000) return _catalog.models;
  const res = await fetch(`${IF_BASE}/api/ai/models`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY || token}` },
  });
  if (!res.ok) throw new Error(`model catalog failed (${res.status})`);
  const data = await res.json();
  const models: GatewayModel[] = Array.isArray(data) ? data : (data.data ?? data.models ?? []);
  _catalog = { at: Date.now(), models };
  return models;
}

/** A model costs nothing at all — the default ceiling for free plans. */
function isZeroCost(m: GatewayModel): boolean {
  return Number(m.inputPrice ?? 0) === 0 && Number(m.outputPrice ?? 0) === 0;
}

/**
 * What a free plan is allowed to spend per million input tokens.
 * `billing_plans.limits.max_model_input_price` on the free plan, default 0
 * (genuinely zero-cost models only). Raise it to e.g. 0.2 to let the free tier
 * reach very cheap models such as deepseek/deepseek-v4-flash ($0.14/M).
 */
function freeModelCeiling(limits: Record<string, any>): number {
  const cap = Number(limits?.max_model_input_price);
  return Number.isFinite(cap) && cap >= 0 ? cap : 0;
}

function withinFreeCeiling(m: GatewayModel, ceiling: number): boolean {
  if (ceiling <= 0) return isZeroCost(m);
  return Number(m.inputPrice ?? 0) <= ceiling;
}

/** Text-in/text-out only: embedding, rerank, audio and safety models are not chat models. */
function isChatModel(m: GatewayModel): boolean {
  const id = m.id || '';
  if (/embed|rerank|content-safety|tts|whisper|s2\.|audio/i.test(id)) return false;
  const out = m.outputModality;
  return !out || out.includes('text');
}

/**
 * Version components of an id, for comparing releases: opus-5 beats opus-4.8.
 * Each digit run is its own component so "4.10" reads as [4, 10] and correctly
 * outranks "4.9" → [4, 9]; parsing it as the float 4.10 would rank it lower.
 */
function versionKey(id: string): number[] {
  return (id.match(/\d+/g) || []).map(Number);
}

function compareVersions(a: string, b: string): number {
  const va = versionKey(a);
  const vb = versionKey(b);
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const d = (vb[i] ?? -1) - (va[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

interface ResolvedModel {
  model: string;
  tier: 'free' | 'paid';
  plan: string;
  reason: string;
  organizationId: string | null;
}

interface AiScope {
  workspace_id?: string | null;
  organization_id?: string | null;
  function_slug?: string;
}

/** Resolve the org behind a scope, plus whether it is on a paid plan today. */
async function resolveEntitlement(
  scope: AiScope,
  token: string,
): Promise<{ org: any | null; tier: 'free' | 'paid'; plan: string; limits: Record<string, any> }> {
  let organizationId = scope.organization_id ?? null;
  if (!organizationId && scope.workspace_id) {
    const ws = (await dbSelect('workspaces', `id=eq.${scope.workspace_id}&select=organization_id&limit=1`, token))[0];
    organizationId = ws?.organization_id ?? null;
  }
  if (!organizationId) return { org: null, tier: 'free', plan: 'free', limits: {} };

  const org = (await dbSelect(
    'organizations',
    `id=eq.${organizationId}&select=id,plan,billing_status,preferred_model&limit=1`,
    token,
  ))[0];
  if (!org) return { org: null, tier: 'free', plan: 'free', limits: {} };

  // Founder grants are always fully entitled.
  if (org.plan === 'lifetime_founder') {
    return { org, tier: 'paid', plan: 'lifetime_founder', limits: {} };
  }

  const planRow = (await dbSelect('billing_plans', `code=eq.${encodeURIComponent(org.plan || 'free')}&limit=1`, token))[0];
  // Paid entitlement requires BOTH a paid plan and a currently-good standing.
  const paid = Boolean(planRow?.is_paid) && ['active', 'trialing'].includes(org.billing_status);
  return {
    org,
    tier: paid ? 'paid' : 'free',
    plan: org.plan || 'free',
    limits: planRow?.limits || {},
  };
}

/**
 * Pick the model for this scope. Free plans are hard-limited to zero-cost
 * models; paid plans get their chosen model, or the highest-ranked family
 * available on the gateway right now.
 */
async function resolveModel(scope: AiScope, token: string, exclude: string[] = []): Promise<ResolvedModel> {
  let ent: Awaited<ReturnType<typeof resolveEntitlement>>;
  try {
    ent = await resolveEntitlement(scope, token);
  } catch {
    ent = { org: null, tier: 'free', plan: 'free', limits: {} };
  }
  const tier = ent.tier;
  const fallback = tier === 'paid' ? PAID_FALLBACK_MODEL : FREE_FALLBACK_MODEL;

  let models: GatewayModel[];
  try {
    models = (await gatewayModels(token)).filter(isChatModel);
  } catch {
    return { model: fallback, tier, plan: ent.plan, reason: 'gateway catalog unavailable — using fallback', organizationId: ent.org?.id ?? null };
  }

  // Free tier: capped by cost. This is a hard constraint, not a preference —
  // a free plan can never be routed to a model above its ceiling.
  const ceiling = freeModelCeiling(ent.limits);
  const eligible = (tier === 'free' ? models.filter((m) => withinFreeCeiling(m, ceiling)) : models)
    .filter((m) => !exclude.includes(m.id));
  if (!eligible.length) {
    return { model: fallback, tier, plan: ent.plan, reason: 'no eligible models in catalog — using fallback', organizationId: ent.org?.id ?? null };
  }

  // A paid org's explicit choice wins, as long as it is still available.
  const preferred = ent.org?.preferred_model;
  if (tier === 'paid' && preferred && eligible.some((m) => m.id === preferred)) {
    return { model: preferred, tier, plan: ent.plan, reason: 'workspace-selected model', organizationId: ent.org?.id ?? null };
  }

  let prefs: any[] = [];
  try {
    prefs = await dbSelect('model_preferences', `tier=eq.${tier}&active=is.true&order=rank.desc&limit=50`, token);
  } catch { /* fall through to price heuristics */ }

  for (const pref of prefs) {
    const matches = eligible.filter((m) => m.id.includes(pref.pattern));
    if (!matches.length) continue;
    // Newest version first; among equals prefer the cheaper variant.
    matches.sort((a, b) => compareVersions(a.id, b.id) || Number(a.inputPrice ?? 0) - Number(b.inputPrice ?? 0));
    return {
      model: matches[0].id,
      tier,
      plan: ent.plan,
      reason: `best available match for "${pref.pattern}"`,
      organizationId: ent.org?.id ?? null,
    };
  }

  // Nothing matched a preference: for free take any zero-cost chat model, for
  // paid take the most expensive (a reasonable proxy for most capable).
  const sorted = [...eligible].sort((a, b) =>
    tier === 'paid'
      ? Number(b.inputPrice ?? 0) - Number(a.inputPrice ?? 0)
      : compareVersions(a.id, b.id));
  return { model: sorted[0].id, tier, plan: ent.plan, reason: 'no preference matched — chose from catalog', organizationId: ent.org?.id ?? null };
}

// --- InsForge Model Gateway (all Seerist LLM calls go through this) ---------

async function aiChat(
  messages: Array<{ role: string; content: string }>,
  token: string,
  opts: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    /** Whose plan pays for this call. Omit only for calls with no tenant. */
    scope?: AiScope;
  } = {},
): Promise<string> {
  let model = opts.model;
  let tier: 'free' | 'paid' = 'paid';
  let resolved: ResolvedModel | null = null;

  if (!model) {
    if (opts.scope) {
      resolved = await resolveModel(opts.scope, token);
      model = resolved.model;
      tier = resolved.tier;
      await enforceUsageCap(opts.scope, resolved, token);
    } else {
      model = DEFAULT_MODEL;
    }
  }

  const send = async (m: string) => {
    const res = await fetch(`${IF_BASE}/api/ai/chat/completion`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: m,
        messages,
        maxTokens: opts.maxTokens ?? 1200,
        temperature: opts.temperature ?? 0.4,
      }),
    });
    return res;
  };

  let res = await send(model!);
  // A model can be retired from the gateway between catalog refreshes — never
  // let that take the whole product down; retry once on the tier's fallback.
  if (!res.ok && !opts.model) {
    const fallback = tier === 'paid' ? PAID_FALLBACK_MODEL : FREE_FALLBACK_MODEL;
    if (fallback !== model) {
      console.warn(`model ${model} failed (${res.status}) — retrying on ${fallback}`);
      _catalog = null;
      model = fallback;
      res = await send(fallback);
    }
  }
  if (!res.ok) throw new Error(`model gateway failed (${res.status}): ${await res.text()}`);

  let text: string = (await res.json()).text ?? '';

  // A model can answer one prompt happily and return an empty completion for
  // the next, reporting success either way. An empty string is not something a
  // caller can interpret, so treat it as that model failing and move to the
  // next-best one rather than passing nothing back up.
  if (!text.trim() && !opts.model && opts.scope) {
    const next = await resolveModel(opts.scope, token, [model!]);
    if (next.model !== model) {
      console.warn(`empty completion from ${model} — retrying on ${next.model}`);
      model = next.model;
      res = await send(model);
      if (res.ok) text = (await res.json()).text ?? '';
    }
  }

  if (resolved && opts.scope) void logAiUsage(opts.scope, model!, tier, token);

  return text;
}

/**
 * A model call whose reply has to be JSON.
 *
 * The gateway serves whichever model ranks best today, so the reply's shape is
 * not stable across model swaps: a more verbose model runs out of token budget
 * part-way through the object and returns a truncated one. The gateway reports
 * that as success, so it surfaces as an unparseable reply. Retrying once with
 * room to finish keeps a model change from quietly breaking a feature.
 */
async function aiJson(
  messages: Array<{ role: string; content: string }>,
  token: string,
  opts: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    scope?: AiScope;
  } = {},
): Promise<any> {
  const raw = await aiChat(messages, token, opts);
  try {
    return parseJsonLoose(raw);
  } catch {
    console.warn(`unparseable JSON from ${opts.scope?.function_slug ?? 'model call'} — retrying with a larger budget`);
    const roomier = Math.min(Math.max((opts.maxTokens ?? 1200) * 2, 1200), 4000);
    const retry = await aiChat(
      messages.concat({
        role: 'system',
        content: 'Your previous reply could not be parsed as JSON. Reply with the JSON object ONLY — no prose, no code fence, no explanation — and keep the strings short enough that the object is complete and closed.',
      }),
      token,
      { ...opts, maxTokens: roomier },
    );
    return parseJsonLoose(retry);
  }
}

/** Monthly AI-action cap from the plan's limits. Paid-plan overage is allowed. */
async function enforceUsageCap(scope: AiScope, resolved: ResolvedModel, token: string): Promise<void> {
  if (!resolved.organizationId) return;
  try {
    const planRow = (await dbSelect('billing_plans', `code=eq.${encodeURIComponent(resolved.plan)}&limit=1`, token))[0];
    const cap = Number(planRow?.limits?.ai_actions_per_month);
    if (!Number.isFinite(cap) || cap <= 0) return;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const used = await dbCount(
      'ai_usage_log',
      `organization_id=eq.${resolved.organizationId}&created_at=gte.${monthStart.toISOString()}`,
      token,
    );
    if (used >= cap) {
      throw new Error(
        `Monthly AI limit reached for the ${resolved.plan} plan (${used}/${cap} actions this month). Upgrade in Settings → Billing to continue.`,
      );
    }
  } catch (e) {
    // Only a real cap breach should stop the call; a metering failure must not.
    if (e instanceof Error && e.message.includes('Monthly AI limit reached')) throw e;
  }
}

async function logAiUsage(scope: AiScope, model: string, tier: string, token: string): Promise<void> {
  try {
    let organizationId = scope.organization_id ?? null;
    if (!organizationId && scope.workspace_id) {
      const ws = (await dbSelect('workspaces', `id=eq.${scope.workspace_id}&select=organization_id&limit=1`, token))[0];
      organizationId = ws?.organization_id ?? null;
    }
    if (!organizationId && !scope.workspace_id) return;
    await dbInsert('ai_usage_log', [{
      organization_id: organizationId,
      workspace_id: scope.workspace_id ?? null,
      model,
      tier,
      function_slug: scope.function_slug ?? null,
    }], token);
  } catch (e) {
    console.error('usage log failed:', e instanceof Error ? e.message : e);
  }
}

function parseJsonLoose(text: string): any {
  const cleaned = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/```\s*$/m, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    throw new Error('model did not return valid JSON');
  }
}


/**
 * Score one proposal and store the result.
 *
 * Lives here rather than in score-job because the scheduled scan needs exactly
 * the same behaviour, and a function on this platform cannot call another over
 * HTTP — Deno Deploy answers 508 Loop Detected. Duplicating the prompt would
 * guarantee the two drift apart.
 */
async function scoreProposal(
  proposal_id: string,
  token: string,
  userId: string | null,
): Promise<{ proposal: any; score: number; reasoning: string; calibration: any } | { error: string; status: 404 }> {
  const proposal = (await dbSelect('proposals', `id=eq.${proposal_id}&limit=1`, token))[0];
  if (!proposal) return { error: 'Proposal not found', status: 404 as const };

  const job = (await dbSelect('job_postings', `id=eq.${proposal.job_posting_id}&limit=1`, token))[0];
  const ws = (await dbSelect('workspaces', `id=eq.${proposal.workspace_id}&limit=1`, token))[0];
  if (!job || !ws) return { error: 'Job or workspace not found', status: 404 as const };

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


  return { proposal: updated, score, reasoning, calibration: history.summary };
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

    const reasons: Record<string, number> = {};
    for (const p of resolved) {
      if (p.outcome === 'lost' && p.outcome_category) {
        reasons[p.outcome_category] = (reasons[p.outcome_category] || 0) + 1;
      }
    }
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

/**
 * Send an alert to wherever the workspace asked for them.
 *
 * Alerts always go to the workspace's own channel, never to a client — an
 * external communication on the org's behalf is reserved for a human click
 * (spec §12).
 */
const ALERT_TOOLS: Record<string, { tool: string; args: (msg: string, to?: string) => Record<string, unknown> }> = {
  slack: { tool: 'SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL', args: (m, to) => ({ channel: to || '#general', text: m }) },
  telegram: { tool: 'TELEGRAM_SEND_MESSAGE', args: (m, to) => ({ chat_id: to, text: m }) },
  discord: { tool: 'DISCORD_CREATE_MESSAGE', args: (m, to) => ({ channel_id: to, content: m }) },
  gmail: { tool: 'GMAIL_SEND_EMAIL', args: (m, to) => ({ recipient_email: to, subject: 'Seerist alert', body: m }) },
};

async function sendAlert(
  channel: string,
  message: string,
  to: string | null,
): Promise<{ sent: boolean; detail: string }> {
  const spec = ALERT_TOOLS[channel];
  if (!spec) return { sent: false, detail: `Unknown alert channel "${channel}"` };
  const key = Deno.env.get('COMPOSIO_API_KEY');
  if (!key) return { sent: false, detail: 'Composio is not configured (COMPOSIO_API_KEY secret missing).' };

  try {
    const accounts = await composioApi(`/connected_accounts?toolkit_slugs=${encodeURIComponent(channel)}&limit=5`, key);
    const account = (accounts.items || []).find((a: any) => (a.status || '').toUpperCase() === 'ACTIVE')
      || (accounts.items || [])[0];
    if (!account) return { sent: false, detail: `No connected ${channel} account — connect it in Settings → Integrations.` };
    const exec = await composioApi(`/tools/execute/${spec.tool}`, key, {
      method: 'POST',
      body: JSON.stringify({ connected_account_id: account.id, arguments: spec.args(message, to ?? undefined) }),
    });
    return { sent: exec.successful !== false, detail: exec.successful === false ? 'Composio rejected the message' : 'sent' };
  } catch (e) {
    return { sent: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function composioApi(path: string, key: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`https://backend.composio.dev/api/v3${path}`, {
    ...init,
    headers: { 'x-api-key': key, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Composio ${res.status}`);
  return data;
}

// --- Audit helpers -----------------------------------------------------------

async function logPersona(
  entry: {
    organization_id?: string | null;
    workspace_id?: string | null;
    persona: string;
    action: string;
    params?: Record<string, unknown>;
    result?: string;
    requires_approval?: boolean;
    approval_status?: string;
    created_by?: string | null;
  },
  token: string,
): Promise<void> {
  try {
    await dbInsert('persona_action_log', [
      {
        organization_id: entry.organization_id ?? null,
        workspace_id: entry.workspace_id ?? null,
        persona: entry.persona,
        action: entry.action,
        params: entry.params ?? {},
        result: entry.result ?? null,
        requires_approval: entry.requires_approval ?? false,
        approval_status: entry.approval_status ?? 'auto_approved',
        created_by: entry.created_by ?? null,
      },
    ], token);
  } catch (e) {
    console.error('persona log failed:', e instanceof Error ? e.message : e);
  }
}

/**
 * Record one automation tick. A scheduled job that quietly stops running is
 * worse than no scheduled job at all, so every run leaves a row — including
 * the runs that found nothing to do. Never allowed to fail the work it logs.
 */
async function recordRun(
  workspaceId: string | null,
  job: string,
  status: 'ok' | 'skipped' | 'failed',
  detail: string,
  items: number,
  token: string,
): Promise<void> {
  try {
    await dbInsert('automation_runs', [{
      workspace_id: workspaceId,
      job,
      status,
      detail: detail.slice(0, 500),
      items,
    }], token);
  } catch (e) {
    console.error('automation run log failed:', e instanceof Error ? e.message : e);
  }
}

async function logStatusChange(
  proposalId: string,
  from: string | null,
  to: string,
  changedBy: string | null,
  note: string | null,
  token: string,
): Promise<void> {
  await dbInsert('proposal_status_history', [
    { proposal_id: proposalId, from_status: from, to_status: to, changed_by: changedBy, note },
  ], token);
}
