// @include _shared
// ============================================================================
// closer-draft — Module D, The Closer. Post-win client communications:
// kickoff emails, scheduling notes, check-ins. Drafts via the model gateway;
// optional real send through Composio-managed Gmail when the founder has a
// connected Gmail account (never sends without send=true — external comms are
// human-approved by design).
// ============================================================================

const PURPOSES = ['kickoff', 'scheduling', 'checkin', 'delivery_handoff'];

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
  const { proposal_id, purpose = 'kickoff', send = false, to } = body;
  if (!proposal_id) return json({ error: 'proposal_id is required' }, 400);
  const kind = PURPOSES.includes(purpose) ? purpose : 'kickoff';

  try {
    const proposal = (await dbSelect('proposals', `id=eq.${proposal_id}&limit=1`, token))[0];
    if (!proposal) return json({ error: 'Proposal not found' }, 404);
    if (proposal.outcome !== 'won') return json({ error: 'The Closer works on WON contracts' }, 422);
    const job = (await dbSelect('job_postings', `id=eq.${proposal.job_posting_id}&limit=1`, token))[0];
    const ws = (await dbSelect('workspaces', `id=eq.${proposal.workspace_id}&limit=1`, token))[0];

    const raw = await aiChat([
      { role: 'system', content: `You are The Closer, Seerist's client-communications persona for "${ws.name}". Draft a ${kind.replace('_', ' ')} email to the client who just hired us. Warm, professional, concise (<180 words). Match the workspace tone: ${ws.tone_style || 'professional, direct, warm'}. Respond with STRICT JSON: {"subject": "<subject line>", "body": "<email body>"}` },
      { role: 'user', content: `Contract: ${job?.title}\nOur winning proposal:\n${(proposal.draft_content || '').slice(0, 2000)}` },
    ], token, { maxTokens: 600, temperature: 0.5 });
    const draft = parseJsonLoose(raw);

    let sent = false;
    let sendDetail: string | null = null;
    if (send && to) {
      // External communication requires the human to have explicitly clicked
      // send (send=true only comes from the confirm dialog in the UI).
      const composioKey = Deno.env.get('COMPOSIO_API_KEY');
      if (!composioKey) {
        sendDetail = 'Composio is not configured (COMPOSIO_API_KEY secret missing).';
      } else {
        try {
          const accounts = await (await fetch('https://backend.composio.dev/api/v3/connected_accounts?toolkit_slugs=gmail', {
            headers: { 'x-api-key': composioKey },
          })).json();
          const account = (accounts.items || [])[0];
          if (!account) {
            sendDetail = 'No Gmail account connected via Composio yet. Connect one in Settings → Integrations.';
          } else {
            const exec = await fetch('https://backend.composio.dev/api/v3/tools/execute/GMAIL_SEND_EMAIL', {
              method: 'POST',
              headers: { 'x-api-key': composioKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                connected_account_id: account.id,
                arguments: { recipient_email: to, subject: draft.subject, body: draft.body },
              }),
            });
            const execData = await exec.json().catch(() => ({}));
            sent = exec.ok && execData.successful !== false;
            sendDetail = sent ? `Sent to ${to} via Composio Gmail.` : `Composio send failed: ${JSON.stringify(execData).slice(0, 200)}`;
          }
        } catch (e) {
          sendDetail = `Composio unreachable: ${e instanceof Error ? e.message : e}`;
        }
      }
    }

    await logPersona({
      workspace_id: proposal.workspace_id,
      persona: 'The Closer',
      action: sent ? 'send_client_email' : 'draft_client_email',
      params: { proposal_id, purpose: kind, to: to || null },
      result: `${draft.subject}${sendDetail ? ` — ${sendDetail}` : ''}`.slice(0, 400),
      created_by: userId,
    }, token);

    return json({ subject: draft.subject, body: draft.body, sent, sendDetail });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Closer draft failed' }, 500);
  }
}
