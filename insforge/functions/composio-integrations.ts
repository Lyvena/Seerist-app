// @include _shared
// ============================================================================
// composio-integrations — Third-party tool access via Composio managed OAuth
// (Slack / Telegram / Discord alerts, Gmail, Calendar, CRM, Drive, Notion).
// NOT used for Creem (native integration) or GitHub/GitLab (OpenHands native)
// — one integration path per external service, per spec §5.
//
// Actions (POST {action, ...}):
//   status              → the full toolkit catalog + connected accounts
//   connect             → begin managed-OAuth for a toolkit, returns redirect
//   send_alert          → send a message via slack/telegram/discord/gmail
//   create_event        → Google Calendar event (The Closer's scheduling)
//   crm_upsert_contact  → HubSpot contact upsert
//   save_document       → Google Drive file or Notion page
//   ingest_document     → READ a Notion page / Google Doc into workspace memory
//   social_post         → LinkedIn post
// ============================================================================

const COMPOSIO_BASE = 'https://backend.composio.dev/api/v3';

/**
 * Every service spec §5 requires managed-OAuth access to. `connect` accepts any
 * slug here; `status` reports each one's connection state so Settings can show
 * the whole surface rather than only the four alert channels.
 */
const TOOLKITS: Array<{ slug: string; label: string; category: string; persona: string }> = [
  { slug: 'slack', label: 'Slack', category: 'alerts', persona: 'The Scout' },
  { slug: 'telegram', label: 'Telegram', category: 'alerts', persona: 'The Scout' },
  { slug: 'discord', label: 'Discord', category: 'alerts', persona: 'The Scout' },
  { slug: 'gmail', label: 'Gmail', category: 'email', persona: 'The Closer' },
  { slug: 'googlecalendar', label: 'Google Calendar', category: 'scheduling', persona: 'The Closer' },
  { slug: 'hubspot', label: 'HubSpot CRM', category: 'crm', persona: 'The Grower' },
  { slug: 'googledrive', label: 'Google Drive', category: 'documents', persona: 'The Builder' },
  { slug: 'notion', label: 'Notion', category: 'documents', persona: 'The Drafter' },
  { slug: 'linkedin', label: 'LinkedIn', category: 'social', persona: 'The Grower' },
];

// ALERT_TOOLS and the send itself live in _shared: the scheduled jobs need to
// alert too, and a function cannot call another over HTTP on this platform.

/** Find a usable connected account for a toolkit, or explain what's missing. */
async function connectedAccountFor(toolkit: string, key: string): Promise<any> {
  const accounts = await composio(`/connected_accounts?toolkit_slugs=${encodeURIComponent(toolkit)}&limit=5`, key);
  const account = (accounts.items || []).find((a: any) => (a.status || '').toUpperCase() === 'ACTIVE')
    || (accounts.items || [])[0];
  if (!account) {
    throw Object.assign(
      new Error(`No connected ${toolkit} account. Connect one in Settings → Integrations first.`),
      { setupNeeded: true },
    );
  }
  return account;
}

async function executeTool(tool: string, toolkit: string, args: Record<string, unknown>, key: string): Promise<any> {
  const account = await connectedAccountFor(toolkit, key);
  return await composio(`/tools/execute/${tool}`, key, {
    method: 'POST',
    body: JSON.stringify({ connected_account_id: account.id, arguments: args }),
  });
}

/**
 * Pull readable prose out of a Composio tool result. Notion and Google Docs
 * return quite different shapes, so walk the response and collect every string
 * rather than binding to one provider's schema.
 */
function extractText(payload: unknown, depth = 0): string {
  if (depth > 8 || payload == null) return '';
  if (typeof payload === 'string') return payload.length > 1 ? `${payload} ` : '';
  if (typeof payload === 'number' || typeof payload === 'boolean') return '';
  if (Array.isArray(payload)) return payload.map((p) => extractText(p, depth + 1)).join('');
  return Object.entries(payload as Record<string, unknown>)
    // Skip identifier-ish noise so the summary sees content, not UUIDs.
    .filter(([k]) => !/^(id|ids|url|href|type|object|created_time|last_edited_time|color)$/i.test(k))
    .map(([, v]) => extractText(v, depth + 1))
    .join('');
}

async function composio(path: string, key: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${COMPOSIO_BASE}${path}`, {
    ...init,
    headers: { 'x-api-key': key, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Composio ${path} failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const token = bearer(req);
  if (!token) return json({ error: 'Sign in required' }, 401);
  const userId = userIdFromToken(token) || 'seerist-user';

  const key = Deno.env.get('COMPOSIO_API_KEY');
  if (!key) return json({ error: 'Composio is not configured (COMPOSIO_API_KEY secret missing).' }, 501);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const action = body.action || 'status';

  try {
    if (action === 'status') {
      const [configs, accounts] = await Promise.all([
        composio('/auth_configs?limit=50', key).catch(() => ({ items: [] })),
        composio('/connected_accounts?limit=50', key).catch(() => ({ items: [] })),
      ]);
      const authConfigs = (configs.items || []).map((c: any) => ({
        id: c.id, toolkit: c.toolkit?.slug || c.toolkit, name: c.name,
      }));
      const connectedAccounts = (accounts.items || []).map((a: any) => ({
        id: a.id, toolkit: a.toolkit?.slug || a.toolkit, status: a.status,
      }));
      return json({
        authConfigs,
        connectedAccounts,
        // The full required surface, each with its state, so Settings can show
        // every service rather than only the ones already connected.
        toolkits: TOOLKITS.map((t) => {
          const account = connectedAccounts.find((a: any) => a.toolkit === t.slug);
          return {
            ...t,
            hasAuthConfig: authConfigs.some((c: any) => c.toolkit === t.slug),
            connected: Boolean(account),
            status: account?.status ?? null,
          };
        }),
      });
    }

    if (action === 'connect') {
      const { toolkit } = body;
      if (!toolkit) return json({ error: 'toolkit is required (e.g. slack, gmail, googlecalendar, notion, hubspot, googledrive, telegram, discord)' }, 400);
      const configs = await composio(`/auth_configs?toolkit_slug=${encodeURIComponent(toolkit)}&limit=10`, key);
      const cfg = (configs.items || [])[0];
      if (!cfg) {
        return json({
          error: `No Composio auth config exists for "${toolkit}" yet. Create one in the Composio dashboard (an OAuth app per connected service), then retry.`,
          setupNeeded: true,
        }, 424);
      }
      const created = await composio('/connected_accounts', key, {
        method: 'POST',
        body: JSON.stringify({
          auth_config: { id: cfg.id },
          connection: { user_id: userId, callback_url: body.callback_url || undefined },
        }),
      });
      return json({
        redirectUrl: created.connectionData?.val?.redirectUrl || created.redirect_url || created.redirectUrl || null,
        connectedAccountId: created.id,
        status: created.status,
      });
    }

    if (action === 'send_alert') {
      const { channel, message, to, workspace_id } = body;
      if (!ALERT_TOOLS[channel] || !message) {
        return json({ error: `channel (${Object.keys(ALERT_TOOLS).join('|')}) and message are required` }, 400);
      }
      const exec = await sendAlert(channel, String(message), to ?? null);
      if (workspace_id) {
        await logPersona({
          workspace_id,
          persona: 'The Scout',
          action: 'send_alert',
          params: { channel, to: to || null },
          result: String(message).slice(0, 200),
          created_by: userId,
        }, token);
      }
      return json({ sent: exec.sent, detail: exec.detail });
    }

    // --- The Closer: scheduling ------------------------------------------
    if (action === 'create_event') {
      const { summary, start_iso, end_iso, attendees, description, workspace_id } = body;
      if (!summary || !start_iso) return json({ error: 'summary and start_iso are required' }, 400);
      const exec = await executeTool('GOOGLECALENDAR_CREATE_EVENT', 'googlecalendar', {
        summary: String(summary).slice(0, 300),
        description: description ? String(description).slice(0, 4000) : undefined,
        start_datetime: start_iso,
        event_duration_hour: Number(body.duration_hours) || 1,
        ...(end_iso ? { end_datetime: end_iso } : {}),
        ...(Array.isArray(attendees) && attendees.length ? { attendees } : {}),
      }, key);
      if (workspace_id) {
        await logPersona({
          workspace_id, persona: 'The Closer', action: 'create_event',
          params: { summary, start_iso }, result: 'Calendar event created via Composio.', created_by: userId,
        }, token);
      }
      return json({ created: exec.successful !== false, detail: exec });
    }

    // --- The Grower: CRM ---------------------------------------------------
    if (action === 'crm_upsert_contact') {
      const { email, first_name, last_name, company, workspace_id } = body;
      if (!email) return json({ error: 'email is required' }, 400);
      const exec = await executeTool('HUBSPOT_CREATE_CONTACT', 'hubspot', {
        properties: {
          email: String(email).slice(0, 320),
          ...(first_name ? { firstname: String(first_name).slice(0, 120) } : {}),
          ...(last_name ? { lastname: String(last_name).slice(0, 120) } : {}),
          ...(company ? { company: String(company).slice(0, 200) } : {}),
        },
      }, key);
      if (workspace_id) {
        await logPersona({
          workspace_id, persona: 'The Grower', action: 'crm_upsert_contact',
          params: { email }, result: 'Contact upserted in HubSpot via Composio.', created_by: userId,
        }, token);
      }
      return json({ upserted: exec.successful !== false, detail: exec });
    }

    // --- The Builder / The Drafter: documents ------------------------------
    if (action === 'save_document') {
      const { target, title, content, workspace_id } = body;
      if (!title || !content) return json({ error: 'title and content are required' }, 400);
      if (target === 'notion') {
        const exec = await executeTool('NOTION_CREATE_NOTION_PAGE', 'notion', {
          parent_id: body.parent_id,
          title: String(title).slice(0, 300),
          content: String(content).slice(0, 100000),
        }, key);
        if (workspace_id) {
          await logPersona({
            workspace_id, persona: 'The Drafter', action: 'save_document',
            params: { target: 'notion', title }, result: 'Page created in Notion via Composio.', created_by: userId,
          }, token);
        }
        return json({ saved: exec.successful !== false, target: 'notion', detail: exec });
      }
      const exec = await executeTool('GOOGLEDRIVE_CREATE_FILE_FROM_TEXT', 'googledrive', {
        file_name: String(title).slice(0, 200),
        text_content: String(content).slice(0, 100000),
        ...(body.folder_id ? { folder_to_upload_to: body.folder_id } : {}),
      }, key);
      if (workspace_id) {
        await logPersona({
          workspace_id, persona: 'The Builder', action: 'save_document',
          params: { target: 'googledrive', title }, result: 'File created in Google Drive via Composio.', created_by: userId,
        }, token);
      }
      return json({ saved: exec.successful !== false, target: 'googledrive', detail: exec });
    }

    // --- Read-only product-doc ingestion (spec §3.2) -----------------------
    // Pulls a Notion page or Google Doc into workspace memory under the same
    // key site-ingest uses, so The Drafter's product mentions and the Growth
    // Engine's page generation are grounded in the real documentation. Strictly
    // read-only: nothing is ever written back to Notion or Drive here.
    if (action === 'ingest_document') {
      const { workspace_id, source, document_id } = body;
      if (!workspace_id || !document_id) {
        return json({ error: 'workspace_id and document_id are required' }, 400);
      }
      const target = source === 'googledocs' ? 'googledocs' : 'notion';
      const exec = target === 'notion'
        ? await executeTool('NOTION_FETCH_A_PAGE', 'notion', { page_id: String(document_id) }, key)
        : await executeTool('GOOGLEDOCS_GET_DOCUMENT_BY_ID', 'googledocs', { id: String(document_id) }, key);

      const text = extractText(exec).slice(0, 16000);
      if (text.length < 50) {
        return json({ error: 'That document had too little readable text to ingest.' }, 422);
      }

      const parsed = await aiJson([
        {
          role: 'system',
          content: 'You are The Grower. From this product documentation, extract what a proposal writer needs to describe the product accurately. Respond with STRICT JSON: {"summary": "<4-6 sentences>", "positioning": "<2-3 sentences: who it is for and the key differentiator>"}',
        },
        { role: 'user', content: text },
      ], token, { maxTokens: 700, temperature: 0.3, scope: { workspace_id, function_slug: 'composio-integrations' } });

      const memoryKey = `product_docs_${target}_${String(document_id).slice(0, 24)}`;
      const existing = await dbSelect(
        'workspace_memories',
        `workspace_id=eq.${workspace_id}&key=eq.${encodeURIComponent(memoryKey)}&limit=1`,
        token,
      );
      const content = `${parsed.positioning}\n\n${parsed.summary}`;
      if (existing.length) {
        await dbPatch('workspace_memories', `id=eq.${existing[0].id}`, { content, source: target }, token);
      } else {
        await dbInsert('workspace_memories', [{
          workspace_id, key: memoryKey, kind: 'preference', content, source: target,
        }], token);
      }

      await logPersona({
        workspace_id,
        persona: 'The Grower',
        action: 'ingest_document',
        params: { source: target, document_id },
        result: String(parsed.positioning || '').slice(0, 400),
        created_by: userId,
      }, token);

      return json({ ingested: true, source: target, positioning: parsed.positioning, summary: parsed.summary });
    }

    // --- The Grower: social -------------------------------------------------
    if (action === 'social_post') {
      const { content, workspace_id } = body;
      if (!content) return json({ error: 'content is required' }, 400);
      const exec = await executeTool('LINKEDIN_CREATE_LINKED_IN_POST', 'linkedin', {
        commentary: String(content).slice(0, 3000),
        visibility: body.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
      }, key);
      if (workspace_id) {
        await logPersona({
          workspace_id, persona: 'The Grower', action: 'social_post',
          params: { network: 'linkedin' }, result: String(content).slice(0, 200), created_by: userId,
        }, token);
      }
      return json({ posted: exec.successful !== false, detail: exec });
    }

    return json({
      error: `Unknown action "${action}" (status | connect | send_alert | create_event | crm_upsert_contact | save_document | social_post)`,
    }, 400);
  } catch (e) {
    console.error(e);
    const setupNeeded = Boolean((e as any)?.setupNeeded);
    return json(
      { error: e instanceof Error ? e.message : 'Composio call failed', setupNeeded },
      setupNeeded ? 424 : 502,
    );
  }
}
