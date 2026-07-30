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

// --- InsForge Model Gateway (all Seerist LLM calls go through this) ---------

async function aiChat(
  messages: Array<{ role: string; content: string }>,
  token: string,
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const res = await fetch(`${IF_BASE}/api/ai/chat/completion`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      messages,
      maxTokens: opts.maxTokens ?? 1200,
      temperature: opts.temperature ?? 0.4,
    }),
  });
  if (!res.ok) throw new Error(`model gateway failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.text ?? '';
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
