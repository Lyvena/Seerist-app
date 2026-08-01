// @include _shared
// ============================================================================
// site-ingest — Module C. Pulls the SaaS workspace's site/docs/positioning in
// once, summarizes it via the model gateway, and stores the positioning in
// workspace memory so Module A's product-mention drafting is grounded in the
// real product ("the Brain the bidder draws from").
// ============================================================================

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  const { workspace_id, url } = body;
  if (!workspace_id || !url || !/^https?:\/\//i.test(url)) {
    return json({ error: 'workspace_id and a valid http(s) url are required' }, 400);
  }

  let jobId: string | null = null;
  try {
    const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
    if (!ws) return json({ error: 'Workspace not found or not a member' }, 404);

    const [job] = await dbInsert('site_ingestion_jobs', [{ workspace_id, url, status: 'running' }], token);
    jobId = job.id;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SeeristBot/1.0 (+https://seerist.xyz)' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Site returned ${res.status}`);
    const text = stripHtml(await res.text()).slice(0, 16000);
    if (text.length < 100) throw new Error('Page had too little readable text to ingest');

    const raw = await aiChat([
      { role: 'system', content: 'You are The Grower, Seerist\'s growth analyst. From this website text, extract the product positioning a bidding copywriter needs. Respond with STRICT JSON: {"summary": "<4-6 sentence factual summary of what the product does>", "positioning": "<2-3 sentences: the sharpest way to describe this product to a prospective client, including who it is for and its key differentiator>"}' },
      { role: 'user', content: `URL: ${url}\n\nSITE TEXT:\n${text}` },
    ], token, { maxTokens: 700, temperature: 0.3, scope: { workspace_id, function_slug: 'site-ingest' } });
    const parsed = parseJsonLoose(raw);

    const [updated] = await dbPatch('site_ingestion_jobs', `id=eq.${jobId}`, {
      status: 'complete',
      summary: String(parsed.summary || ''),
      positioning: String(parsed.positioning || ''),
      last_synced_at: new Date().toISOString(),
      error: null,
    }, token);

    // Ground drafting: upsert the positioning into workspace memory.
    const existing = await dbSelect(
      'workspace_memories',
      `workspace_id=eq.${workspace_id}&key=eq.product_positioning&limit=1`,
      token,
    );
    if (existing.length) {
      await dbPatch('workspace_memories', `id=eq.${existing[0].id}`, {
        content: `${parsed.positioning}\n\n${parsed.summary}`,
        source: url,
      }, token);
    } else {
      await dbInsert('workspace_memories', [{
        workspace_id,
        key: 'product_positioning',
        kind: 'preference',
        content: `${parsed.positioning}\n\n${parsed.summary}`,
        source: url,
      }], token);
    }

    await logPersona({
      workspace_id,
      persona: 'The Grower',
      action: 'site_ingest',
      params: { url, job_id: jobId },
      result: String(parsed.positioning || '').slice(0, 400),
      created_by: userId,
    }, token);

    return json({ job: updated });
  } catch (e) {
    console.error(e);
    if (jobId) {
      try {
        await dbPatch('site_ingestion_jobs', `id=eq.${jobId}`, {
          status: 'failed',
          error: e instanceof Error ? e.message : String(e),
        }, token!);
      } catch { /* best effort */ }
    }
    return json({ error: e instanceof Error ? e.message : 'ingestion failed' }, 500);
  }
}
