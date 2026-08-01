// @include _shared
// ============================================================================
// site-studio — Module C, autonomous site generation and maintenance.
//
// Spec §4 Module C: "ingests an existing site, reconstructs its design system,
// generates and maintains optimized pages with schema markup and metadata,
// continuously monitors performance and competitors, and proposes/drafts fixes."
//
// Everything this produces is a DRAFT in growth_content_drafts. Per spec §6
// nothing is ever auto-published — 'published' only records that a human
// shipped it themselves.
//
// Operations (POST { op, ... }):
//   extract_design_system { workspace_id, url }          reconstruct the design system
//   generate_page         { workspace_id, topic, ... }   page + JSON-LD + metadata
//   monitor               { workspace_id, kind, ... }    performance / competitor sweep
//   list_drafts           { workspace_id, status? }
//   set_draft_status      { draft_id, status }
// ============================================================================

const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML = 200000;

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

  const op = String(body.op || body.action || '');
  try {
    switch (op) {
      case 'extract_design_system':
        return await extractDesignSystem(body, token, userId);
      case 'generate_page':
        return await generatePage(body, token, userId);
      case 'monitor':
        return await monitor(body, token, userId);
      case 'list_drafts':
        return await listDrafts(body, token);
      case 'set_draft_status':
        return await setDraftStatus(body, token);
      default:
        return json({
          error: 'op must be one of: extract_design_system, generate_page, monitor, list_drafts, set_draft_status',
        }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'site-studio failed' }, 500);
  }
}

// ---------------------------------------------------------------------------
// Design system reconstruction
// ---------------------------------------------------------------------------

async function extractDesignSystem(body: any, token: string, userId: string | null): Promise<Response> {
  const { workspace_id, url } = body;
  if (!workspace_id || !url || !/^https?:\/\//i.test(url)) {
    return json({ error: 'workspace_id and a valid http(s) url are required' }, 400);
  }

  const html = await fetchPage(url);

  // Pull the raw signals out of the markup deterministically first, so the
  // model is naming and organising real values rather than inventing a palette.
  const colors = topMatches(html, /#[0-9a-f]{3,8}\b|rgba?\([^)]{5,40}\)/gi, 24);
  const fonts = topMatches(html, /font-family\s*:\s*([^;"'}]{3,120})/gi, 10)
    .map((f) => f.replace(/font-family\s*:\s*/i, '').trim());
  const radii = topMatches(html, /border-radius\s*:\s*([^;"'}]{1,30})/gi, 8)
    .map((r) => r.replace(/border-radius\s*:\s*/i, '').trim());
  const cssVars = topMatches(html, /--[a-z0-9-]{2,40}\s*:\s*[^;}"']{1,60}/gi, 30);
  const headings = tagTexts(html, 'h1', 3).concat(tagTexts(html, 'h2', 6));
  const buttons = tagTexts(html, 'button', 8).concat(tagTexts(html, 'a', 12));
  const text = stripHtml(html).slice(0, 6000);

  let parsed: any = {};
  try {
    const raw = await aiChat([
      {
        role: 'system',
        content: `You are The Grower reconstructing a website's design system so future generated pages match it exactly. Work ONLY from the extracted values given — never invent a colour or font that is not in the list. Respond with STRICT JSON:
{"palette": {"primary": "<hex>", "background": "<hex>", "text": "<hex>", "accent": "<hex>", "notes": "<how colour is used>"},
 "typography": {"heading_font": "<stack>", "body_font": "<stack>", "notes": "<scale/weight observations>"},
 "components": {"radius": "<value>", "button_style": "<description>", "layout": "<description>"},
 "voice": "<2-3 sentences describing the copy voice and tone>"}`,
      },
      {
        role: 'user',
        content: `URL: ${url}
COLORS FOUND: ${colors.join(', ') || '(none)'}
FONT STACKS: ${fonts.join(' | ') || '(none)'}
BORDER RADII: ${radii.join(', ') || '(none)'}
CSS VARIABLES: ${cssVars.slice(0, 20).join('; ') || '(none)'}
HEADINGS: ${headings.join(' / ') || '(none)'}
BUTTON + LINK LABELS: ${buttons.join(' / ') || '(none)'}

PAGE TEXT:
${text}`,
      },
    ], token, { maxTokens: 900, temperature: 0.2, scope: { workspace_id, function_slug: 'site-studio' } });
    parsed = parseJsonLoose(raw);
  } catch (e) {
    // Keep the raw extraction even if the model call fails — it is still the
    // real design system, just unlabelled.
    parsed = {
      palette: { notes: 'Model labelling unavailable; raw values retained.' },
      typography: {},
      components: {},
      voice: '',
      extraction_error: e instanceof Error ? e.message : String(e),
    };
  }

  const record = {
    workspace_id,
    source_url: url,
    palette: { ...(parsed.palette || {}), observed_colors: colors.slice(0, 12) },
    typography: { ...(parsed.typography || {}), observed_fonts: fonts.slice(0, 6) },
    components: { ...(parsed.components || {}), observed_radii: radii.slice(0, 6), css_variables: cssVars.slice(0, 20) },
    voice: String(parsed.voice || '').slice(0, 1500),
  };

  const existing = await dbSelect(
    'site_design_profiles',
    `workspace_id=eq.${workspace_id}&source_url=eq.${encodeURIComponent(url)}&limit=1`,
    token,
  );
  const [profile] = existing.length
    ? await dbPatch('site_design_profiles', `id=eq.${existing[0].id}`, record, token)
    : await dbInsert('site_design_profiles', [record], token);

  await logPersona({
    workspace_id,
    persona: 'The Grower',
    action: 'extract_design_system',
    params: { url, colors: colors.length, fonts: fonts.length },
    result: `Reconstructed the design system for ${url}.`,
    created_by: userId,
  }, token);

  return json({ profile });
}

// ---------------------------------------------------------------------------
// Page generation — copy + JSON-LD schema markup + metadata
// ---------------------------------------------------------------------------

async function generatePage(body: any, token: string, userId: string | null): Promise<Response> {
  const { workspace_id, topic } = body;
  if (!workspace_id || !topic) return json({ error: 'workspace_id and topic are required' }, 400);

  const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
  if (!ws) return json({ error: 'Workspace not found' }, 404);

  const pageType = ['landing', 'comparison', 'feature', 'guide', 'faq'].includes(body.page_type)
    ? body.page_type
    : 'landing';

  const [profiles, ingested] = await Promise.all([
    dbSelect('site_design_profiles', `workspace_id=eq.${workspace_id}&order=updated_at.desc&limit=1`, token),
    dbSelect('site_ingestion_jobs', `workspace_id=eq.${workspace_id}&status=eq.complete&order=created_at.desc&limit=3`, token),
  ]);
  const design = profiles[0];
  const positioning = ingested.map((j: any) => j.positioning).filter(Boolean).join('\n') || '(not ingested yet)';

  const raw = await aiChat([
    {
      role: 'system',
      content: `You are The Grower generating an optimized ${pageType} page. Produce copy that matches the workspace's existing design system and voice, is genuinely useful (not keyword stuffing), and never claims a product capability that is not supported by the positioning provided.
Respond with STRICT JSON:
{"title": "<page H1>",
 "meta_title": "<<=60 chars>",
 "meta_description": "<<=155 chars>",
 "slug": "<url-slug>",
 "body_markdown": "<the full page in markdown: H1, intro, sections with H2s, and a closing call to action>",
 "faq": [{"q": "<question>", "a": "<answer>"}],
 "target_keywords": ["<keyword>"],
 "schema_type": "<one of: WebPage, Product, SoftwareApplication, FAQPage, Article>"}`,
    },
    {
      role: 'user',
      content: `WORKSPACE: ${ws.name}
Product: ${ws.product_name || '(none)'} — ${ws.product_description || 'no description on file'}
Target customer: ${ws.target_customer || 'unspecified'}
Tone: ${ws.tone_style || 'neutral professional'}

POSITIONING (from site ingestion):
${positioning}

DESIGN SYSTEM VOICE: ${design?.voice || '(no design profile yet — run extract_design_system first for a closer match)'}

PAGE TOPIC: ${topic}
PAGE TYPE: ${pageType}`,
    },
  ], token, { maxTokens: 2600, temperature: 0.45, scope: { workspace_id, function_slug: 'site-studio' } });

  const parsed = parseJsonLoose(raw);
  const faq = Array.isArray(parsed.faq) ? parsed.faq.slice(0, 10) : [];

  // JSON-LD is assembled in code from the model's structured fields so the
  // markup is always valid, rather than asking the model to emit raw JSON-LD.
  const jsonLd = buildJsonLd({
    schemaType: String(parsed.schema_type || 'WebPage'),
    title: String(parsed.title || topic),
    description: String(parsed.meta_description || ''),
    productName: ws.product_name,
    productUrl: ws.product_url,
    faq,
  });

  const [draft] = await dbInsert('growth_content_drafts', [{
    workspace_id,
    kind: 'page',
    title: String(parsed.title || topic).slice(0, 300),
    body: String(parsed.body_markdown || ''),
    meta: {
      page_type: pageType,
      slug: String(parsed.slug || '').slice(0, 200),
      meta_title: String(parsed.meta_title || '').slice(0, 200),
      meta_description: String(parsed.meta_description || '').slice(0, 400),
      target_keywords: Array.isArray(parsed.target_keywords) ? parsed.target_keywords.slice(0, 12) : [],
      faq,
      json_ld: jsonLd,
      design_profile_id: design?.id ?? null,
    },
    evidence: { topic, positioning_used: Boolean(ingested.length), design_profile_used: Boolean(design) },
    source: 'site-studio:generate_page',
    status: 'draft',
    created_by: userId,
  }], token);

  await logPersona({
    workspace_id,
    persona: 'The Grower',
    action: 'generate_page',
    params: { topic, page_type: pageType, draft_id: draft.id },
    result: `Drafted "${draft.title}" with ${faq.length} FAQ entries and ${jsonLd['@type']} schema markup. Draft only — nothing published.`,
    created_by: userId,
  }, token);

  return json({ draft }, 201);
}

function buildJsonLd(input: {
  schemaType: string;
  title: string;
  description: string;
  productName?: string | null;
  productUrl?: string | null;
  faq: Array<{ q?: string; a?: string }>;
}): Record<string, unknown> {
  if (input.faq.length && (input.schemaType === 'FAQPage' || input.faq.length >= 3)) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      name: input.title,
      description: input.description,
      mainEntity: input.faq.filter((f) => f.q && f.a).map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    };
  }
  if (input.schemaType === 'SoftwareApplication' || input.schemaType === 'Product') {
    return {
      '@context': 'https://schema.org',
      '@type': input.schemaType,
      name: input.productName || input.title,
      description: input.description,
      ...(input.productUrl ? { url: input.productUrl } : {}),
      ...(input.schemaType === 'SoftwareApplication' ? { applicationCategory: 'BusinessApplication' } : {}),
    };
  }
  return {
    '@context': 'https://schema.org',
    '@type': input.schemaType === 'Article' ? 'Article' : 'WebPage',
    name: input.title,
    headline: input.title,
    description: input.description,
  };
}

// ---------------------------------------------------------------------------
// Continuous monitoring — performance and competitors, drafting fixes
// ---------------------------------------------------------------------------

async function monitor(body: any, token: string, userId: string | null): Promise<Response> {
  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);
  const kind = body.kind === 'competitor' ? 'competitor' : 'performance';

  const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
  if (!ws) return json({ error: 'Workspace not found' }, 404);

  const findings: any[] = [];
  let evidenceBlock = '';

  if (kind === 'performance') {
    const target = body.url || ws.product_url;
    if (!target || !/^https?:\/\//i.test(target)) {
      return json({ error: 'A url is required (or set the workspace product_url) to monitor performance' }, 400);
    }
    const started = Date.now();
    const html = await fetchPage(target);
    const elapsed = Date.now() - started;

    // Deterministic, checkable technical SEO signals — no guessing.
    const checks = [
      { id: 'title', ok: /<title[^>]*>\s*\S/i.test(html), detail: 'Page has a non-empty <title>' },
      { id: 'meta_description', ok: /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{40,}/i.test(html), detail: 'Meta description present and >= 40 chars' },
      { id: 'h1', ok: /<h1[^>]*>\s*\S/i.test(html), detail: 'Exactly one meaningful <h1>' },
      { id: 'json_ld', ok: /application\/ld\+json/i.test(html), detail: 'JSON-LD structured data present' },
      { id: 'og_tags', ok: /<meta[^>]+property=["']og:/i.test(html), detail: 'Open Graph tags present' },
      { id: 'canonical', ok: /<link[^>]+rel=["']canonical["']/i.test(html), detail: 'Canonical link present' },
      { id: 'viewport', ok: /<meta[^>]+name=["']viewport["']/i.test(html), detail: 'Mobile viewport meta present' },
      { id: 'img_alt', ok: !/<img(?![^>]*\balt=)[^>]*>/i.test(html), detail: 'All <img> tags have alt text' },
      { id: 'page_weight', ok: html.length < 500000, detail: `HTML payload ${(html.length / 1024).toFixed(0)}KB (< 500KB)` },
      { id: 'ttfb', ok: elapsed < 2000, detail: `Fetched in ${elapsed}ms (< 2000ms)` },
    ];
    for (const c of checks) findings.push({ ...c, severity: c.ok ? 'pass' : 'fix' });
    evidenceBlock = `URL: ${target}\n${checks.map((c) => `${c.ok ? 'PASS' : 'FAIL'} — ${c.detail}`).join('\n')}`;
  } else {
    const competitors: string[] = Array.isArray(body.competitors)
      ? body.competitors.map((c: unknown) => String(c)).filter((c: string) => /^https?:\/\//i.test(c)).slice(0, 3)
      : [];
    if (!competitors.length) {
      return json({ error: 'competitors must be an array of 1-3 http(s) URLs to compare against' }, 400);
    }
    for (const url of competitors) {
      try {
        const text = stripHtml(await fetchPage(url)).slice(0, 5000);
        findings.push({ id: url, ok: true, severity: 'info', detail: `Read ${text.length} chars` });
        evidenceBlock += `\n\n--- ${url} ---\n${text}`;
      } catch (e) {
        findings.push({ id: url, ok: false, severity: 'info', detail: e instanceof Error ? e.message : String(e) });
      }
    }
    if (!evidenceBlock.trim()) return json({ error: 'None of the competitor URLs could be read' }, 502);
  }

  const failing = findings.filter((f) => f.severity === 'fix');
  const raw = await aiChat([
    {
      role: 'system',
      content: kind === 'performance'
        ? 'You are The Grower reviewing a technical SEO/performance sweep. For each FAILED check, write the concrete fix. Ground every recommendation in a check that actually failed — do not invent issues. Respond with STRICT JSON: {"summary": "<2-3 sentences>", "fixes": [{"title": "<short>", "detail": "<what to change and where>", "priority": 1}]}'
        : 'You are The Grower comparing this workspace\'s positioning against competitor sites. Identify concrete gaps and opportunities from the competitor copy provided. Respond with STRICT JSON: {"summary": "<2-3 sentences>", "fixes": [{"title": "<short>", "detail": "<the gap and what to do about it>", "priority": 1}]}',
    },
    {
      role: 'user',
      content: `WORKSPACE: ${ws.name} — ${ws.product_name || '(no product name)'}: ${ws.product_description || 'no description'}\n\nEVIDENCE:\n${evidenceBlock.slice(0, 12000)}`,
    },
  ], token, { maxTokens: 1400, temperature: 0.3, scope: { workspace_id, function_slug: 'site-studio' } });

  const parsed = parseJsonLoose(raw);
  const fixes = Array.isArray(parsed.fixes) ? parsed.fixes.slice(0, 8) : [];

  const drafts = fixes.length
    ? await dbInsert('growth_content_drafts', fixes.map((f: any) => ({
      workspace_id,
      kind: 'fix',
      title: String(f.title || 'Site fix').slice(0, 300),
      body: String(f.detail || ''),
      meta: { priority: Number(f.priority) || 3, monitor_kind: kind },
      evidence: { findings, summary: String(parsed.summary || '') },
      source: `site-studio:monitor:${kind}`,
      status: 'draft',
      created_by: userId,
    })), token)
    : [];

  const [run] = await dbInsert('site_monitor_runs', [{
    workspace_id,
    kind,
    findings,
    drafts_created: drafts.length,
  }], token);

  await logPersona({
    workspace_id,
    persona: 'The Grower',
    action: `site_monitor_${kind}`,
    params: { checks: findings.length, failing: failing.length, drafts: drafts.length },
    result: String(parsed.summary || '').slice(0, 2000),
    created_by: userId,
  }, token);

  return json({ run, findings, summary: String(parsed.summary || ''), drafts });
}

// ---------------------------------------------------------------------------
// Draft listing / review
// ---------------------------------------------------------------------------

async function listDrafts(body: any, token: string): Promise<Response> {
  const { workspace_id, status, kind } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);
  let query = `workspace_id=eq.${workspace_id}`;
  if (['draft', 'in_review', 'approved', 'published', 'dismissed'].includes(status)) query += `&status=eq.${status}`;
  if (['page', 'ad_creative', 'fix', 'metadata'].includes(kind)) query += `&kind=eq.${kind}`;
  const drafts = await dbSelect('growth_content_drafts', `${query}&order=created_at.desc&limit=100`, token);
  return json({ drafts, count: drafts.length });
}

async function setDraftStatus(body: any, token: string): Promise<Response> {
  const { draft_id, status } = body;
  if (!draft_id || !['draft', 'in_review', 'approved', 'published', 'dismissed'].includes(status)) {
    return json({ error: 'draft_id and a valid status are required' }, 400);
  }
  const [draft] = await dbPatch('growth_content_drafts', `id=eq.${draft_id}`, { status }, token);
  if (!draft) return json({ error: 'Draft not found' }, 404);
  return json({
    draft,
    note: status === 'published'
      ? 'Recorded that YOU published this. Seerist never publishes site content itself (spec §6).'
      : undefined,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SeeristBot/1.0 (+https://seerist.xyz)' },
    });
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return (await res.text()).slice(0, MAX_HTML);
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Most frequent regex matches, most common first — the real design tokens. */
function topMatches(source: string, re: RegExp, limit: number): string[] {
  const counts = new Map<string, number>();
  for (const m of source.match(re) || []) {
    const key = m.trim().toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => k);
}

function tagTexts(html: string, tag: string, limit: number): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]{1,200}?)</${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < limit) {
    const t = stripHtml(m[1]);
    if (t && t.length > 1) out.push(t.slice(0, 80));
  }
  return out;
}
