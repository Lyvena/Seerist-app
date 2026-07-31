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

const ALERT_TOOLS: Record<string, { tool: string; args: (msg: string, to?: string) => Record<string, unknown> }> = {
  slack: { tool: 'SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL', args: (m, to) => ({ channel: to || '#general', text: m }) },
  telegram: { tool: 'TELEGRAM_SEND_MESSAGE', args: (m, to) => ({ chat_id: to, text: m }) },
  discord: { tool: 'DISCORD_CREATE_MESSAGE', args: (m, to) => ({ channel_id: to, content: m }) },
  gmail: { tool: 'GMAIL_SEND_EMAIL', args: (m, to) => ({ recipient_email: to, subject: 'Seerist alert', body: m }) },
};

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
      const spec = ALERT_TOOLS[channel];
      if (!spec || !message) return json({ error: `channel (${Object.keys(ALERT_TOOLS).join('|')}) and message are required` }, 400);
      const exec = await executeTool(spec.tool, channel, spec.args(message, to), key);
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
      return json({ sent: exec.successful !== false, detail: exec });
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
