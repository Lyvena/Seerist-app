// @include _shared
// ============================================================================
// composio-integrations — Third-party tool access via Composio managed OAuth
// (Slack / Telegram / Discord alerts, Gmail, Calendar, CRM, Drive, Notion).
// NOT used for Creem (native integration) or GitHub/GitLab (OpenHands native)
// — one integration path per external service, per spec §5.
//
// Actions (POST {action, ...}):
//   status              → auth configs + connected accounts overview
//   connect             → begin managed-OAuth for a toolkit, returns redirect
//   send_alert          → send a message via slack/telegram/discord/gmail
// ============================================================================

const COMPOSIO_BASE = 'https://backend.composio.dev/api/v3';
const ALERT_TOOLS: Record<string, { tool: string; args: (msg: string, to?: string) => Record<string, unknown> }> = {
  slack: { tool: 'SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL', args: (m, to) => ({ channel: to || '#general', text: m }) },
  telegram: { tool: 'TELEGRAM_SEND_MESSAGE', args: (m, to) => ({ chat_id: to, text: m }) },
  discord: { tool: 'DISCORD_CREATE_MESSAGE', args: (m, to) => ({ channel_id: to, content: m }) },
  gmail: { tool: 'GMAIL_SEND_EMAIL', args: (m, to) => ({ recipient_email: to, subject: 'Seerist alert', body: m }) },
};

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
      return json({
        authConfigs: (configs.items || []).map((c: any) => ({
          id: c.id, toolkit: c.toolkit?.slug || c.toolkit, name: c.name,
        })),
        connectedAccounts: (accounts.items || []).map((a: any) => ({
          id: a.id, toolkit: a.toolkit?.slug || a.toolkit, status: a.status,
        })),
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
      const accounts = await composio(`/connected_accounts?toolkit_slugs=${encodeURIComponent(channel === 'gmail' ? 'gmail' : channel)}&limit=5`, key);
      const account = (accounts.items || []).find((a: any) => (a.status || '').toUpperCase() === 'ACTIVE') || (accounts.items || [])[0];
      if (!account) {
        return json({ error: `No connected ${channel} account. Connect one in Settings → Integrations first.`, setupNeeded: true }, 424);
      }
      const exec = await composio(`/tools/execute/${spec.tool}`, key, {
        method: 'POST',
        body: JSON.stringify({ connected_account_id: account.id, arguments: spec.args(message, to) }),
      });
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

    return json({ error: `Unknown action "${action}" (status | connect | send_alert)` }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Composio call failed' }, 502);
  }
}
