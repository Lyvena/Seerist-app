// @include _shared
// ============================================================================
// deploy-sync — Module C deploy-triggered docs & site sync. A CI/CD webhook
// fires on every deploy; an LLM pipeline diffs the changed code/API surface
// against current docs & marketing copy and drafts updates to both.
// Output is ALWAYS a draft — never auto-published (spec §6).
//
// Auth: either a signed-in member, or the CI webhook using
// ?token=<DEPLOY_SYNC_TOKEN> (project secret). Webhook mode uses the service
// key for DB + model gateway access.
// ============================================================================

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const url = new URL(req.url);
  const userToken = bearer(req);
  const webhookToken = url.searchParams.get('token');
  const expected = Deno.env.get('DEPLOY_SYNC_TOKEN');

  let token: string | null = null;
  let actor: string | null = null;
  if (userToken) {
    token = userToken;
    actor = userIdFromToken(userToken);
  } else if (webhookToken && expected && webhookToken === expected) {
    token = SERVICE_KEY; // CI webhook path — acts with the service role.
  }
  if (!token) return json({ error: 'Sign in or provide a valid ?token=' }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { workspace_id, deploy_ref, change_summary, diff } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);
  const changes = String(change_summary || diff || '').slice(0, 12000);
  if (!changes) return json({ error: 'change_summary or diff is required' }, 400);

  try {
    const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
    if (!ws) return json({ error: 'Workspace not found' }, 404);

    const parsed = await aiJson([
      { role: 'system', content: 'You are The Grower, drafting post-deploy documentation and marketing-site updates. Given a deploy\'s change summary or diff, draft (1) developer-docs updates and (2) marketing site copy updates that reflect the change. These are DRAFTS a human will review — never claim they are live. Respond with STRICT JSON: {"change_summary": "<1-2 sentence summary>", "docs_draft": "<markdown docs update draft>", "site_draft": "<marketing copy update draft>"}' },
      { role: 'user', content: `Product: ${ws.product_name || ws.name} — ${ws.product_description || ''}\nDeploy ref: ${deploy_ref || '(unspecified)'}\n\nCHANGES:\n${changes}` },
    ], token, { maxTokens: 1800, temperature: 0.4, scope: { workspace_id, function_slug: 'deploy-sync' } });

    const [draft] = await dbInsert('deploy_sync_drafts', [{
      workspace_id,
      trigger_source: userToken ? 'manual' : 'ci_webhook',
      deploy_ref: deploy_ref || null,
      change_summary: String(parsed.change_summary || changes.slice(0, 300)),
      docs_draft: String(parsed.docs_draft || ''),
      site_draft: String(parsed.site_draft || ''),
      status: 'draft',
    }], token);

    await logPersona({
      workspace_id,
      persona: 'The Grower',
      action: 'deploy_sync_draft',
      params: { deploy_ref: deploy_ref || null, draft_id: draft.id },
      result: 'Docs + site drafts generated (draft-only, human review required).',
      created_by: actor,
    }, token);

    return json({ draft }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'deploy sync failed' }, 500);
  }
}
