// @include _shared
// ============================================================================
// ingest-job-email — Module A discovery. Turns the job-alert emails a
// workspace ALREADY receives from Upwork / Fiverr / Freelancer / Toptal into
// job_postings, so Seerist can see a job before a human has opened it.
//
// Why this exists: extension capture requires somebody to already be on the
// job page, which means the product could never actually solve the "good jobs
// are lost by replying late" problem in spec §2. This reads mail the user is
// already sent. It is not scraping, not an API call, and — critically — it
// still submits nothing. The permanent boundary in spec §12 governs
// SUBMISSION, not discovery, and is untouched here.
//
// Routing: the recipient address carries a per-workspace token
// (jobs+<intake_token>@…). A From address is trivially forged, so it is never
// trusted for routing — only the token is.
//
// Scoring and alerting are deliberately NOT done here. An alert email can hold
// a dozen jobs and each scoring call takes seconds; doing it inline would blow
// the request budget. Ingest stays fast and the scheduled scan (automation-tick)
// scores and alerts within the hour.
//
// Auth: ?token=<INTAKE_WEBHOOK_TOKEN> project secret, so only your own mail
// provider can post here.
// ============================================================================

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const url = new URL(req.url);
  const expected = Deno.env.get('INTAKE_WEBHOOK_TOKEN');
  const supplied = url.searchParams.get('token');
  // Signed-in members may post directly too (the in-app "paste an alert email"
  // box), in which case their own token authorises the call.
  const userToken = bearer(req);
  if (!userToken && !(expected && supplied && supplied === expected)) {
    return json({ error: 'Sign in or provide a valid ?token=' }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const recipient = firstRecipient(body);
  const rawText = String(body.text || body.plain || body.body || stripTags(String(body.html || ''))).slice(0, 40000);
  const subject = String(body.subject || '').slice(0, 500);
  const sender = String(body.from || body.sender || '').slice(0, 300);

  try {
    // --- Route to a workspace ------------------------------------------------
    let ws: any = null;
    if (body.workspace_id && userToken) {
      // In-app paste: the caller's own token proves membership through RLS.
      ws = (await dbSelect('workspaces', `id=eq.${body.workspace_id}&limit=1`, userToken))[0];
    } else {
      const token = intakeToken(recipient) || String(body.intake_token || '');
      if (!token) {
        return json({ error: 'No workspace token in the recipient address' }, 422);
      }
      ws = (await dbSelect(
        'workspaces',
        `intake_token=eq.${encodeURIComponent(token)}&limit=1`,
        SERVICE_KEY,
      ))[0];
    }
    if (!ws) return json({ error: 'Unknown intake address' }, 404);
    const db = userToken && body.workspace_id ? userToken : SERVICE_KEY;

    if (!ws.bidding_enabled) {
      return json({
        error: 'Bidding is not enabled for this workspace — complete onboarding and acknowledge the risk disclosure first.',
      }, 423);
    }
    if (!rawText.trim()) return json({ error: 'The email had no readable text' }, 422);

    const platform = detectPlatform(`${sender} ${subject} ${rawText}`);

    // Same kill switch the extension path obeys.
    const conn = (await dbSelect(
      'platform_connections',
      `workspace_id=eq.${ws.id}&platform=eq.${encodeURIComponent(platform)}&limit=1`,
      db,
    ))[0];
    if (conn?.kill_switch) {
      return json({ error: `The ${platform} kill switch is active for this workspace.` }, 423);
    }

    // --- Extract the jobs ----------------------------------------------------
    // An LLM reads the alert rather than a regex: these templates change often
    // and silently, and a broken regex would drop jobs without anyone noticing.
    const parsed = await aiJson([
      {
        role: 'system',
        content: `You are The Scout, reading a freelance-platform job-alert email. Extract EVERY distinct job posting it advertises. Ignore navigation, footers, adverts and profile suggestions. Never invent a job or a field: use null when the email does not say. Respond with STRICT JSON: {"jobs": [{"title": "<title>", "description": "<the posting text, as much as the email gives>", "budget": "<as written, or null>", "url": "<the posting link, or null>", "platform": "<upwork|fiverr|freelancer|toptal>"}]}`,
      },
      { role: 'user', content: `From: ${sender}\nSubject: ${subject}\n\n${rawText.slice(0, 14000)}` },
    ], db, {
      maxTokens: 3000,
      temperature: 0.1,
      scope: { workspace_id: ws.id, function_slug: 'ingest-job-email' },
    });

    const candidates = (Array.isArray(parsed.jobs) ? parsed.jobs : [])
      .filter((j: any) => j && String(j.title || '').trim().length > 3)
      .slice(0, 25);
    if (!candidates.length) {
      await recordRun(ws.id, 'ingest_email', 'skipped', 'No job postings found in that email.', 0, db);
      return json({ ingested: 0, duplicates: 0, detail: 'No job postings found in that email.' });
    }

    // --- Skip anything already in the queue ---------------------------------
    const urls = candidates.map((j: any) => cleanUrl(j.url)).filter(Boolean) as string[];
    const seen = new Set<string>();
    if (urls.length) {
      const existing = await dbSelect(
        'job_postings',
        `workspace_id=eq.${ws.id}&url=in.(${urls.map((u) => `"${u.replace(/"/g, '')}"`).join(',')})&select=url`,
        db,
      );
      for (const row of existing) if (row.url) seen.add(row.url);
    }

    const fresh = candidates.filter((j: any) => {
      const u = cleanUrl(j.url);
      if (!u) return true; // No link to dedupe on — better a duplicate than a lost job.
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });
    const duplicates = candidates.length - fresh.length;

    if (!fresh.length) {
      await recordRun(ws.id, 'ingest_email', 'skipped', 'Every job in that email was already captured.', 0, db);
      return json({ ingested: 0, duplicates, detail: 'Every job in that email was already in your queue.' });
    }

    // --- Insert through the same pipeline capture-job uses -------------------
    const jobs = await dbInsert('job_postings', fresh.map((j: any) => ({
      workspace_id: ws.id,
      source: 'email_alert',
      platform: PLATFORMS.includes(String(j.platform)) ? String(j.platform) : platform,
      title: String(j.title).slice(0, 500),
      description: j.description ? String(j.description).slice(0, 20000) : null,
      budget: j.budget ? String(j.budget).slice(0, 200) : null,
      url: cleanUrl(j.url),
      captured_by: null,
    })), db);

    const proposals = await dbInsert('proposals', jobs.map((job: any) => ({
      workspace_id: ws.id,
      job_posting_id: job.id,
      status: 'new',
      mode: ws.type === 'saas' ? 'saas' : 'agency',
    })), db);

    for (const p of proposals) {
      await logStatusChange(p.id, null, 'new', null, 'Captured from a forwarded job-alert email', db);
    }
    await logPersona({
      workspace_id: ws.id,
      persona: 'The Scout',
      action: 'ingest_job_email',
      params: { platform, ingested: jobs.length, duplicates },
      result: `Found ${jobs.length} new job${jobs.length === 1 ? '' : 's'} in a ${platform} alert email.`,
      created_by: null,
    }, db);
    await recordRun(ws.id, 'ingest_email', 'ok', `${jobs.length} new, ${duplicates} already known.`, jobs.length, db);

    return json({ ingested: jobs.length, duplicates, platform, jobs, proposals }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'email ingestion failed' }, 500);
  }
}

const PLATFORMS = ['upwork', 'fiverr', 'freelancer', 'toptal'];

/** The address the mail was delivered to, across the common webhook shapes. */
function firstRecipient(body: any): string {
  const candidates = [body.to, body.recipient, body.envelope?.to, body.To];
  for (const c of candidates) {
    if (typeof c === 'string' && c) return c;
    if (Array.isArray(c) && c.length) return String(c[0]?.address || c[0] || '');
  }
  return '';
}

/** jobs+<token>@host → token. Anything else routes nowhere, by design. */
function intakeToken(recipient: string): string | null {
  const m = String(recipient).match(/\+([A-Za-z0-9_-]{6,64})@/);
  return m ? m[1] : null;
}

function detectPlatform(haystack: string): string {
  const h = haystack.toLowerCase();
  if (h.includes('fiverr')) return 'fiverr';
  if (h.includes('freelancer')) return 'freelancer';
  if (h.includes('toptal')) return 'toptal';
  return 'upwork';
}

/** Keep only real http(s) links, and drop the tracking query most alerts add. */
function cleanUrl(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  try {
    const u = new URL(raw);
    u.search = '';
    u.hash = '';
    return u.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s{2,}/g, ' ');
}
