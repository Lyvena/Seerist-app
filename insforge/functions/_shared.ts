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

/**
 * Call another Seerist edge function. Failures are returned, never thrown, so a
 * best-effort side call can never fail the caller's primary work.
 */
async function invokeFunction(
  slug: string,
  body: unknown,
  token: string,
): Promise<{ ok: boolean; data: any }> {
  try {
    const res = await fetch(`${IF_BASE}/functions/${slug}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, data: { error: e instanceof Error ? e.message : String(e) } };
  }
}

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

const FREE_FALLBACK_MODEL = Deno.env.get('SEERIST_FREE_MODEL') ?? 'openai/gpt-oss-20b:free';
const PAID_FALLBACK_MODEL = Deno.env.get('SEERIST_PAID_MODEL') ?? 'anthropic/claude-opus-5';

interface GatewayModel {
  id: string;
  inputPrice?: number;
  outputPrice?: number;
  inputModality?: string[];
  outputModality?: string[];
}

let _catalog: { at: number; models: GatewayModel[] } | null = null;

/** The gateway's live model list, cached briefly per isolate. */
async function gatewayModels(token: string): Promise<GatewayModel[]> {
  if (_catalog && Date.now() - _catalog.at < 300000) return _catalog.models;
  const res = await fetch(`${IF_BASE}/api/ai/models`, {
    headers: { Authorization: `Bearer ${token}` },
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
async function resolveModel(scope: AiScope, token: string): Promise<ResolvedModel> {
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
  const eligible = tier === 'free' ? models.filter((m) => withinFreeCeiling(m, ceiling)) : models;
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

  if (resolved && opts.scope) void logAiUsage(opts.scope, model!, tier, token);

  const data = await res.json();
  return data.text ?? '';
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
