// @include _shared
// ============================================================================
// submit-proposal — the authorized-partnership submission path.
//
// Spec §4: "the full code path for an authorized-partnership submission mode is
// built — an interface that, given a platform's official Business-Manager-style
// API relationship, would submit through that authorized channel rather than a
// human click. It ships built and ready. It stays inactive until Seerist has
// that explicit relationship with a given platform."
//
// Spec §1, §6 and §12 make the boundary permanent: there is NO scripted click
// on a user's own session anywhere in this file, and there never will be. That
// is the pattern that gets customer accounts permanently banned. The only two
// outcomes below are (a) an authorized partner-API submission, which requires
// policy_configs.authorized_submission to be true for that platform — it is
// false for every platform today and can only be changed server-side — or
// (b) a 423 telling the human to submit with their own click via the extension.
//
// Operations (POST { op, ... }):
//   check  { proposal_id }   report which submission mode applies, change nothing
//   submit { proposal_id }   attempt authorized submission, else 423
//   mark_submitted { proposal_id }   record a human's own manual submission
// ============================================================================

const HUMAN_CLICK_MESSAGE =
  'Automated submission is not authorized for this platform, by design. Open the job in your browser, use the Seerist extension to autofill your approved draft, review it, and click the platform\'s own Submit button. Seerist will never submit on your behalf without an explicit partnership with that platform.';

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

  const { proposal_id } = body;
  if (!proposal_id) return json({ error: 'proposal_id is required' }, 400);
  const op = String(body.op || body.action || 'check');

  try {
    const proposal = (await dbSelect('proposals', `id=eq.${proposal_id}&limit=1`, token))[0];
    if (!proposal) return json({ error: 'Proposal not found' }, 404);

    const job = (await dbSelect('job_postings', `id=eq.${proposal.job_posting_id}&limit=1`, token))[0];
    const platform = job?.platform || 'upwork';
    const policy = (await dbSelect('policy_configs', `platform=eq.${platform}&limit=1`, token))[0];
    const authorized = Boolean(policy?.authorized_submission);

    if (op === 'check') {
      return json({
        platform,
        mode: authorized ? 'authorized_api' : 'human_click',
        authorized,
        message: authorized
          ? `Seerist has an authorized submission relationship with ${platform}; submissions can go through the partner API.`
          : HUMAN_CLICK_MESSAGE,
      });
    }

    if (op === 'mark_submitted') {
      // The human submitted it themselves — record that fact and move the card.
      if (proposal.status === 'submitted') return json({ error: 'Already marked submitted' }, 409);
      const [updated] = await dbPatch('proposals', `id=eq.${proposal_id}`, {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }, token);
      await logStatusChange(proposal_id, proposal.status, 'submitted', userId, 'Submitted by the human via the platform UI', token);
      await logPersona({
        workspace_id: proposal.workspace_id,
        persona: 'The Drafter',
        action: 'proposal_submitted_by_human',
        params: { proposal_id, platform },
        result: 'Human clicked submit on the platform; Seerist recorded it.',
        created_by: userId,
      }, token);
      return json({ proposal: updated, mode: 'human_click' });
    }

    if (op !== 'submit') return json({ error: 'op must be check, submit or mark_submitted' }, 400);

    // --- The permanent boundary, enforced server-side -----------------------
    if (!authorized) {
      await logPersona({
        workspace_id: proposal.workspace_id,
        persona: 'The Drafter',
        action: 'authorized_submission_refused',
        params: { proposal_id, platform },
        result: `Refused: no authorized submission relationship with ${platform}. Human click required.`,
        created_by: userId,
      }, token);
      return json({ error: HUMAN_CLICK_MESSAGE, mode: 'human_click', platform, authorized: false }, 423);
    }

    if (proposal.status !== 'approved') {
      return json({ error: `Only approved proposals can be submitted (this one is "${proposal.status}")` }, 422);
    }

    // --- Authorized partner-API submission ---------------------------------
    // Reached only when a human has recorded a real partnership for this
    // platform. Endpoint and credentials come from the workspace's connection,
    // so no platform URL is invented here.
    const conn = (await dbSelect(
      'platform_connections',
      `workspace_id=eq.${proposal.workspace_id}&platform=eq.${platform}&limit=1`,
      token,
    ))[0];
    const creds = conn?.credentials || {};
    if (!conn || conn.status !== 'active' || !creds.partner_submit_url) {
      return json({
        error: `${platform} is flagged as an authorized-submission partner, but this workspace has no active connection with a partner_submit_url. Add the partner credentials before submitting.`,
        mode: 'authorized_api',
      }, 424);
    }
    if (conn.kill_switch) {
      return json({ error: `The ${platform} kill switch is engaged — all platform activity is halted.` }, 423);
    }

    const res = await fetch(String(creds.partner_submit_url), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.access_token || creds.api_key || ''}`,
        'Content-Type': 'application/json',
        ...(creds.extra_headers && typeof creds.extra_headers === 'object' ? creds.extra_headers : {}),
      },
      body: JSON.stringify({
        job_url: job?.url ?? null,
        job_external_id: creds.job_id_field && job ? job[creds.job_id_field] : undefined,
        cover_letter: proposal.draft_content,
      }),
    });
    const detail = await res.json().catch(() => ({}));
    if (!res.ok) {
      await logPersona({
        workspace_id: proposal.workspace_id,
        persona: 'The Drafter',
        action: 'authorized_submission_failed',
        params: { proposal_id, platform, status: res.status },
        result: JSON.stringify(detail).slice(0, 1000),
        created_by: userId,
      }, token);
      return json({ error: `Authorized submission failed (${res.status})`, detail }, 502);
    }

    const [updated] = await dbPatch('proposals', `id=eq.${proposal_id}`, {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }, token);
    await logStatusChange(proposal_id, proposal.status, 'submitted', userId, `Submitted via the authorized ${platform} partner API`, token);
    await logPersona({
      workspace_id: proposal.workspace_id,
      persona: 'The Drafter',
      action: 'authorized_submission',
      params: { proposal_id, platform },
      result: `Submitted through the authorized ${platform} partner channel.`,
      created_by: userId,
    }, token);

    return json({ proposal: updated, mode: 'authorized_api', detail });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'submission failed' }, 500);
  }
}
