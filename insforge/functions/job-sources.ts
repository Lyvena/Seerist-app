// @include _shared
// ============================================================================
// job-sources — Module A's JobSource abstraction.
//
// Spec §4: "a `JobSource` interface supports API-based polling per platform
// (`UpworkJobSource`, and equivalents for others as their APIs are reviewed) —
// fully built and code-complete, activating automatically once that platform's
// developer credentials are approved. Both paths feed the same pipeline;
// extension-capture never gets removed once API access exists."
//
// Two implementations of one interface:
//   ExtensionCaptureSource  always live. The Chrome extension posts to
//                           capture-job; this source describes and reports it.
//   ApiPollSource           one per platform. Code-complete, fails closed with
//                           NotEnabled until BOTH policy_configs.
//                           api_polling_enabled is true for that platform AND
//                           the workspace's platform_connections row is active
//                           with credentials.
//
// Both paths insert through the SAME pipeline — job_postings + a 'new' proposal,
// identical to capture-job — so nothing downstream needs to know which was used.
//
// No platform endpoint is hard-coded or guessed: an ApiPollSource reads its
// base URL and search path from the credentials stored on platform_connections
// when that platform's developer access is granted. What IS built here is the
// interface, the activation gating, the request/paging shape, the per-platform
// response normalisation, and the insert path.
//
// Operations (POST { op, ... }):
//   list_sources { workspace_id }                describe every source + status
//   poll         { workspace_id, platform }      run an API poll (fails closed)
// ============================================================================

const PLATFORMS = ['upwork', 'fiverr', 'freelancer', 'toptal'] as const;
type Platform = typeof PLATFORMS[number];

/** Raised when a source exists and is code-complete but not yet authorized. */
class NotEnabled extends Error {
  readonly code = 'NOT_ENABLED';
  constructor(message: string) {
    super(message);
    this.name = 'NotEnabled';
  }
}

interface NormalizedJob {
  title: string;
  description: string;
  budget: string | null;
  url: string | null;
  client_stats: Record<string, unknown>;
}

interface JobSource {
  readonly platform: Platform | 'all';
  readonly kind: 'extension_capture' | 'api_poll';
  /** Human-readable activation state for this workspace. */
  status(workspaceId: string, token: string): Promise<{ active: boolean; reason: string }>;
  /** Fetch new postings. Throws NotEnabled when the source is not authorized. */
  poll(workspaceId: string, token: string): Promise<NormalizedJob[]>;
}

// ---------------------------------------------------------------------------
// ExtensionCaptureSource — the always-available path
// ---------------------------------------------------------------------------

const extensionCaptureSource: JobSource = {
  platform: 'all',
  kind: 'extension_capture',
  async status() {
    return {
      active: true,
      reason: 'Always available. The Chrome extension reads the job page you are already viewing and posts it to capture-job. This is the permanent fallback and is never removed, even once API access exists.',
    };
  },
  poll() {
    throw new NotEnabled('Extension capture is user-initiated — it is pushed from the browser, never polled.');
  },
};

// ---------------------------------------------------------------------------
// ApiPollSource — one per platform, code-complete, gated closed
// ---------------------------------------------------------------------------

/** Per-platform response normalisation into the shared job shape. */
const NORMALIZERS: Record<Platform, (row: any) => NormalizedJob> = {
  upwork: (r) => ({
    title: String(r.title ?? r.name ?? '').slice(0, 400),
    description: String(r.description ?? r.snippet ?? '').slice(0, 18000),
    budget: r.budget ? String(r.budget) : (r.amount?.amount ? `$${r.amount.amount}` : null),
    url: r.url ?? (r.ciphertext ? `https://www.upwork.com/jobs/${r.ciphertext}` : null),
    client_stats: {
      payment_verified: r.client?.paymentVerificationStatus === 'VERIFIED' || r.client?.payment_verified === true,
      total_spent: r.client?.totalSpent ?? r.client?.total_spent ?? null,
      hire_rate: r.client?.hireRate ?? r.client?.hire_rate ?? null,
      rating: r.client?.totalFeedback ?? r.client?.rating ?? null,
      country: r.client?.location?.country ?? null,
    },
  }),
  fiverr: (r) => ({
    title: String(r.title ?? '').slice(0, 400),
    description: String(r.description ?? r.brief ?? '').slice(0, 18000),
    budget: r.budget ? String(r.budget) : (r.price ? `$${r.price}` : null),
    url: r.url ?? r.link ?? null,
    client_stats: { country: r.buyer?.country ?? null, rating: r.buyer?.rating ?? null },
  }),
  freelancer: (r) => ({
    title: String(r.title ?? '').slice(0, 400),
    description: String(r.description ?? r.preview_description ?? '').slice(0, 18000),
    budget: r.budget ? `${r.budget.minimum ?? ''}-${r.budget.maximum ?? ''} ${r.currency?.code ?? ''}`.trim() : null,
    url: r.seo_url ? `https://www.freelancer.com/projects/${r.seo_url}` : (r.url ?? null),
    client_stats: {
      payment_verified: Boolean(r.owner?.status?.payment_verified),
      rating: r.owner?.reputation?.entire_history?.overall ?? null,
      country: r.owner?.location?.country?.name ?? null,
    },
  }),
  toptal: (r) => ({
    title: String(r.title ?? r.role ?? '').slice(0, 400),
    description: String(r.description ?? '').slice(0, 18000),
    budget: r.rate ? String(r.rate) : (r.budget ? String(r.budget) : null),
    url: r.url ?? null,
    client_stats: { company: r.client?.name ?? null, country: r.client?.country ?? null },
  }),
};

function makeApiPollSource(platform: Platform): JobSource {
  return {
    platform,
    kind: 'api_poll',

    async status(workspaceId: string, token: string) {
      const policy = (await dbSelect('policy_configs', `platform=eq.${platform}&limit=1`, token))[0];
      if (!policy?.api_polling_enabled) {
        return {
          active: false,
          reason: `${platform} developer API access has not been approved yet. This source is built and will activate automatically the moment policy_configs.api_polling_enabled is set true for ${platform}.`,
        };
      }
      const conn = (await dbSelect(
        'platform_connections',
        `workspace_id=eq.${workspaceId}&platform=eq.${platform}&limit=1`,
        token,
      ))[0];
      if (!conn) return { active: false, reason: `No ${platform} connection on this workspace.` };
      if (conn.kill_switch) return { active: false, reason: `The ${platform} kill switch is engaged for this workspace.` };
      if (conn.status !== 'active') return { active: false, reason: `The ${platform} connection is "${conn.status}", not active.` };
      if (!conn.credentials?.base_url) {
        return { active: false, reason: `The ${platform} connection is active but has no base_url in its credentials.` };
      }
      return { active: true, reason: `${platform} API polling is authorized and active.` };
    },

    async poll(workspaceId: string, token: string) {
      const state = await this.status(workspaceId, token);
      if (!state.active) throw new NotEnabled(state.reason);

      const conn = (await dbSelect(
        'platform_connections',
        `workspace_id=eq.${workspaceId}&platform=eq.${platform}&limit=1`,
        token,
      ))[0];
      const creds = conn.credentials || {};
      const base = String(creds.base_url).replace(/\/$/, '');
      const path = String(creds.search_path || '/jobs/search');
      const url = `${base}${path}${path.includes('?') ? '&' : '?'}limit=${Number(creds.page_size) || 25}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${creds.access_token || creds.api_key || ''}`,
          Accept: 'application/json',
          ...(creds.extra_headers && typeof creds.extra_headers === 'object' ? creds.extra_headers : {}),
        },
      });
      if (!res.ok) throw new Error(`${platform} API returned ${res.status}: ${(await res.text()).slice(0, 300)}`);

      const data = await res.json();
      const rows: any[] = Array.isArray(data) ? data
        : Array.isArray(data.results) ? data.results
        : Array.isArray(data.jobs) ? data.jobs
        : Array.isArray(data.projects) ? data.projects
        : Array.isArray(data.data) ? data.data
        : [];

      return rows.map(NORMALIZERS[platform]).filter((j) => j.title);
    },
  };
}

const SOURCES: JobSource[] = [
  extensionCaptureSource,
  ...PLATFORMS.map(makeApiPollSource),
];

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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
  const op = String(body.op || body.action || 'list_sources');

  try {
    if (op === 'list_sources') {
      const sources = [];
      for (const s of SOURCES) {
        const state = await s.status(workspace_id, token);
        sources.push({ platform: s.platform, kind: s.kind, active: state.active, reason: state.reason });
      }
      return json({ sources });
    }

    if (op !== 'poll') return json({ error: 'op must be list_sources or poll' }, 400);

    const platform = String(body.platform || '');
    if (!PLATFORMS.includes(platform as Platform)) {
      return json({ error: `platform must be one of: ${PLATFORMS.join(', ')}` }, 400);
    }
    const source = SOURCES.find((s) => s.platform === platform && s.kind === 'api_poll')!;

    let jobs: NormalizedJob[];
    try {
      jobs = await source.poll(workspace_id, token);
    } catch (e) {
      if (e instanceof NotEnabled) {
        return json({
          error: e.message,
          code: 'NOT_ENABLED',
          platform,
          hint: 'Extension capture covers this platform today and is unaffected.',
        }, 423);
      }
      throw e;
    }

    // Same pipeline as capture-job: a job_postings row plus a 'new' proposal.
    const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
    if (!ws) return json({ error: 'Workspace not found' }, 404);

    const existing = await dbSelect(
      'job_postings',
      `workspace_id=eq.${workspace_id}&platform=eq.${platform}&select=url&limit=1000`,
      token,
    );
    const seen = new Set(existing.map((j: any) => j.url).filter(Boolean));
    const fresh = jobs.filter((j) => !j.url || !seen.has(j.url));

    const inserted = fresh.length
      ? await dbInsert('job_postings', fresh.map((j) => ({
        workspace_id,
        source: 'api_poll',
        platform,
        title: j.title,
        description: j.description,
        budget: j.budget,
        client_stats: j.client_stats,
        url: j.url,
        captured_by: userId,
      })), token)
      : [];

    if (inserted.length) {
      await dbInsert('proposals', inserted.map((j: any) => ({
        workspace_id,
        job_posting_id: j.id,
        status: 'new',
        mode: ws.type,
      })), token);
    }

    await logPersona({
      workspace_id,
      persona: 'The Scout',
      action: 'api_poll',
      params: { platform, fetched: jobs.length, inserted: inserted.length },
      result: `Polled ${platform}: ${jobs.length} job(s) returned, ${inserted.length} new.`,
      created_by: userId,
    }, token);

    return json({ platform, fetched: jobs.length, inserted: inserted.length, skipped_duplicates: jobs.length - fresh.length });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'job source failed' }, 500);
  }
}
