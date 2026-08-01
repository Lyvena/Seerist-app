// @include _shared
// ============================================================================
// visitor-intent — Module C, visitor intent and identification.
//
// Spec §4 Module C: "identifies and scores intent from site visitors for
// outreach and CRM sync. This category (sometimes called visitor
// de-anonymization) carries real privacy-law obligations — GDPR/CCPA-style
// disclosure and consent requirements apply depending on where visitors are
// located, and this needs to be reflected in the workspace's own privacy policy
// and consent flow before the feature is enabled for a given site."
//
// So the feature is built CLOSED:
//   * workspaces.visitor_intent_enabled defaults to FALSE.
//   * enable_tracking requires a jurisdiction AND a privacy-policy URL, and
//     records when consent was configured.
//   * record_visit (the public endpoint the customer's site calls) refuses
//     with 423 while tracking is disabled, and stores the per-visitor consent
//     status the site reports. A visitor whose consent is 'denied' is never
//     stored, and one with 'unknown' is stored without identity enrichment.
//   * disable_tracking is always available and takes effect immediately.
//
// Operations (POST { op, ... }):
//   get_settings     { workspace_id }
//   enable_tracking  { workspace_id, jurisdiction, policy_url }
//   disable_tracking { workspace_id }
//   record_visit     { workspace_id, visitor_key, consent, ... }   PUBLIC
//   score_visitors   { workspace_id, limit? }
//   list_records     { workspace_id }
// ============================================================================

const CONSENT_STATES = ['granted', 'denied', 'unknown'];

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const op = String(body.op || body.action || '');

  // record_visit is called by the customer's own website, which has no Seerist
  // session — it authenticates as the service role, exactly like track-signup.
  if (op === 'record_visit') {
    try {
      return await recordVisit(body);
    } catch (e) {
      console.error(e);
      return json({ error: e instanceof Error ? e.message : 'record_visit failed' }, 500);
    }
  }

  const token = bearer(req);
  if (!token) return json({ error: 'Sign in required' }, 401);
  const userId = userIdFromToken(token);

  try {
    switch (op) {
      case 'get_settings':
        return await getSettings(body, token);
      case 'enable_tracking':
        return await enableTracking(body, token, userId);
      case 'disable_tracking':
        return await disableTracking(body, token, userId);
      case 'score_visitors':
        return await scoreVisitors(body, token, userId);
      case 'list_records':
        return await listRecords(body, token);
      default:
        return json({
          error: 'op must be one of: get_settings, enable_tracking, disable_tracking, record_visit, score_visitors, list_records',
        }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'visitor-intent failed' }, 500);
  }
}

// ---------------------------------------------------------------------------
// Consent gate
// ---------------------------------------------------------------------------

async function getSettings(body: any, token: string): Promise<Response> {
  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);
  const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
  if (!ws) return json({ error: 'Workspace not found' }, 404);

  const records = await dbSelect(
    'visitor_intent_records',
    `workspace_id=eq.${workspace_id}&select=id&limit=1000`,
    token,
  );

  return json({
    enabled: Boolean(ws.visitor_intent_enabled),
    jurisdiction: ws.visitor_intent_jurisdiction ?? null,
    policy_url: ws.visitor_intent_policy_url ?? null,
    consent_configured_at: ws.visitor_intent_consent_at ?? null,
    records: records.length,
    disclosure: 'Visitor identification carries GDPR/CCPA-style disclosure and consent obligations that vary by where your visitors are located. Before enabling this, your site must disclose it in your privacy policy and collect consent. Seerist will not accept visitor records until you confirm that below, and a visitor whose consent is denied is never stored.',
  });
}

async function enableTracking(body: any, token: string, userId: string | null): Promise<Response> {
  const { workspace_id, jurisdiction, policy_url } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);
  if (!jurisdiction || String(jurisdiction).trim().length < 2) {
    return json({
      error: 'jurisdiction is required — name the privacy regime your visitors fall under (e.g. "EU/GDPR", "California/CCPA", "UK/UK-GDPR"). This is recorded on every visitor record.',
    }, 400);
  }
  if (!policy_url || !/^https?:\/\//i.test(policy_url)) {
    return json({
      error: 'policy_url is required and must be a live http(s) URL to the privacy policy that discloses visitor identification. Publish that disclosure before enabling this feature.',
    }, 400);
  }

  const [ws] = await dbPatch('workspaces', `id=eq.${workspace_id}`, {
    visitor_intent_enabled: true,
    visitor_intent_jurisdiction: String(jurisdiction).slice(0, 120),
    visitor_intent_policy_url: String(policy_url).slice(0, 500),
    visitor_intent_consent_at: new Date().toISOString(),
  }, token);
  if (!ws) return json({ error: 'Workspace not found' }, 404);

  await logPersona({
    workspace_id,
    persona: 'The Grower',
    action: 'visitor_intent_enabled',
    params: { jurisdiction: ws.visitor_intent_jurisdiction, policy_url: ws.visitor_intent_policy_url },
    result: `Visitor identification enabled by a human, declaring jurisdiction "${ws.visitor_intent_jurisdiction}" and disclosure at ${ws.visitor_intent_policy_url}.`,
    created_by: userId,
  }, token);

  return json({ enabled: true, workspace: ws });
}

async function disableTracking(body: any, token: string, userId: string | null): Promise<Response> {
  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);

  const [ws] = await dbPatch('workspaces', `id=eq.${workspace_id}`, { visitor_intent_enabled: false }, token);
  if (!ws) return json({ error: 'Workspace not found' }, 404);

  await logPersona({
    workspace_id,
    persona: 'The Grower',
    action: 'visitor_intent_disabled',
    params: {},
    result: 'Visitor identification disabled. No further visitor records will be accepted.',
    created_by: userId,
  }, token);

  return json({ enabled: false, note: 'Tracking is off. Existing records are retained until you delete them.' });
}

// ---------------------------------------------------------------------------
// Public ingest — refuses unless the workspace has explicitly opted in
// ---------------------------------------------------------------------------

async function recordVisit(body: any): Promise<Response> {
  const { workspace_id, visitor_key } = body;
  if (!workspace_id || !visitor_key) {
    return json({ error: 'workspace_id and visitor_key are required' }, 400);
  }

  const ws = (await dbSelect(
    'workspaces',
    `id=eq.${workspace_id}&select=id,visitor_intent_enabled,visitor_intent_jurisdiction&limit=1`,
    SERVICE_KEY,
  ))[0];
  if (!ws) return json({ error: 'Unknown workspace' }, 404);
  if (!ws.visitor_intent_enabled) {
    return json({
      error: 'Visitor identification is not enabled for this workspace. Enable it in Growth → Visitors after publishing the required privacy disclosure.',
    }, 423);
  }

  const consent = CONSENT_STATES.includes(body.consent) ? body.consent : 'unknown';
  if (consent === 'denied') {
    // Explicitly refused: record nothing at all.
    return json({ stored: false, reason: 'consent_denied' });
  }

  const key = String(visitor_key).slice(0, 200);
  const signals = {
    pages: Array.isArray(body.pages) ? body.pages.map((p: unknown) => String(p).slice(0, 300)).slice(0, 50) : [],
    referrer: body.referrer ? String(body.referrer).slice(0, 500) : null,
    utm: body.utm && typeof body.utm === 'object' ? body.utm : {},
    duration_seconds: Number(body.duration_seconds) || null,
    // Company enrichment is only kept with explicit consent.
    company_hint: consent === 'granted' && body.company ? String(body.company).slice(0, 200) : null,
  };

  const existing = await dbSelect(
    'visitor_intent_records',
    `workspace_id=eq.${workspace_id}&visitor_key=eq.${encodeURIComponent(key)}&limit=1`,
    SERVICE_KEY,
  );

  const now = new Date().toISOString();
  if (existing.length) {
    const prior = existing[0].signals || {};
    const mergedPages = [...new Set([...(prior.pages || []), ...signals.pages])].slice(0, 100);
    const [record] = await dbPatch('visitor_intent_records', `id=eq.${existing[0].id}`, {
      signals: { ...prior, ...signals, pages: mergedPages },
      consent_status: consent,
      jurisdiction: ws.visitor_intent_jurisdiction ?? null,
      consent_recorded_at: now,
      company: signals.company_hint ?? existing[0].company,
      last_seen_at: now,
    }, SERVICE_KEY);
    return json({ stored: true, record_id: record.id, returning_visitor: true });
  }

  const [record] = await dbInsert('visitor_intent_records', [{
    workspace_id,
    visitor_key: key,
    company: signals.company_hint,
    signals,
    consent_status: consent,
    jurisdiction: ws.visitor_intent_jurisdiction ?? null,
    consent_recorded_at: now,
  }], SERVICE_KEY);

  return json({ stored: true, record_id: record.id, returning_visitor: false }, 201);
}

// ---------------------------------------------------------------------------
// Intent scoring
// ---------------------------------------------------------------------------

async function scoreVisitors(body: any, token: string, userId: string | null): Promise<Response> {
  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);

  const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
  if (!ws) return json({ error: 'Workspace not found' }, 404);
  if (!ws.visitor_intent_enabled) {
    return json({ error: 'Visitor identification is disabled for this workspace.' }, 423);
  }

  const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 50);
  const pending = await dbSelect(
    'visitor_intent_records',
    `workspace_id=eq.${workspace_id}&intent_score=is.null&order=last_seen_at.desc&limit=${limit}`,
    token,
  );
  if (!pending.length) return json({ scored: 0, message: 'No unscored visitor records.' });

  const parsed = await aiJson([
    {
      role: 'system',
      content: `You are The Grower scoring buying intent from anonymous site-visit behaviour. Score 0-100 based ONLY on the behavioural signals given (which pages, how many, how long, referrer, campaign). Never infer identity, demographics or anything about the person. Give a one-sentence reason per visitor.
Respond with STRICT JSON: {"scores": [{"visitor_key": "<key>", "intent_score": <0-100>, "reasoning": "<one sentence>"}]}`,
    },
    {
      role: 'user',
      content: `PRODUCT: ${ws.product_name || ws.name} — ${ws.product_description || 'no description'}
Target customer: ${ws.target_customer || 'unspecified'}

VISITORS:
${pending.map((r: any) => `- ${r.visitor_key}: pages=${(r.signals?.pages || []).join(' > ') || 'none'}; referrer=${r.signals?.referrer || 'direct'}; duration=${r.signals?.duration_seconds ?? '?'}s; utm=${JSON.stringify(r.signals?.utm || {})}`).join('\n')}`,
    },
  ], token, { maxTokens: 1200, temperature: 0.2, scope: { workspace_id, function_slug: 'visitor-intent' } });

  const scores = Array.isArray(parsed.scores) ? parsed.scores : [];

  let updated = 0;
  for (const s of scores) {
    const match = pending.find((r: any) => r.visitor_key === s.visitor_key);
    if (!match) continue;
    const score = Math.max(0, Math.min(100, Math.round(Number(s.intent_score) || 0)));
    await dbPatch('visitor_intent_records', `id=eq.${match.id}`, {
      intent_score: score,
      intent_reasoning: String(s.reasoning || '').slice(0, 600),
    }, token);
    updated++;
  }

  await logPersona({
    workspace_id,
    persona: 'The Grower',
    action: 'score_visitor_intent',
    params: { considered: pending.length, scored: updated },
    result: `Scored ${updated} visitor record(s) from behavioural signals only.`,
    created_by: userId,
  }, token);

  return json({ scored: updated, considered: pending.length });
}

async function listRecords(body: any, token: string): Promise<Response> {
  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);
  const records = await dbSelect(
    'visitor_intent_records',
    `workspace_id=eq.${workspace_id}&order=intent_score.desc.nullslast,last_seen_at.desc&limit=200`,
    token,
  );
  return json({ records, count: records.length });
}
