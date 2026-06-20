import { createClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const OSS_HOST = Deno.env.get('INSFORGE_BASE_URL')!;
const API_KEY = Deno.env.get('INSFORGE_API_KEY')!;

const BRAND = '#7C3AED';
const BG = '#F4F6FB';
const CARD_BG = '#FFFFFF';
const TXT1 = '#1A1A2E';
const TXT2 = '#6B7280';
const TXT3 = '#9CA3AF';
const SUCCESS = '#10B981';

function wrap(html: string, title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" style="max-width:560px">
<tr><td style="padding-bottom:24px;text-align:center">
<img src="https://seerist.xyz/logo.png" alt="Seerist" height="32" style="border:0"/>
</td></tr>
<tr><td style="background:${CARD_BG};border-radius:12px;padding:32px">
${html}
</td></tr>
<tr><td style="padding-top:24px;text-align:center;font-size:12px;color:${TXT3}">
<p style="margin:0 0 4px">Seerist — AI-powered freelance opportunity matching</p>
<p style="margin:0"><a href="https://seerist.xyz/settings/alerts" style="color:${BRAND};text-decoration:underline">Manage alert preferences</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function statBox(value: number | string, label: string, change?: string): string {
  return `<td style="text-align:center;padding:16px 8px;background:${BG};border-radius:8px;width:33%">
    <div style="font-size:24px;font-weight:700;color:${TXT1}">${value}</div>
    <div style="font-size:11px;color:${TXT3};margin-top:2px">${label}</div>
    ${change ? `<div style="font-size:11px;color:${change.startsWith('+') ? SUCCESS : '#EF4444'};margin-top:2px">${change}</div>` : ''}
  </td>`;
}

function topCard(opp: { title: string; platform: string; score: number; url: string }): string {
  const sc = opp.score >= 80 ? SUCCESS : opp.score >= 60 ? BRAND : '#F59E0B';
  return `<tr><td style="padding:8px 0;border-bottom:1px solid ${BG}">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="vertical-align:middle">
<a href="${opp.url}" style="font-size:14px;font-weight:600;color:${TXT1};text-decoration:none">${opp.title}</a>
<p style="font-size:12px;color:${TXT2};margin:2px 0 0">${opp.platform}</p>
</td>
<td width="40" style="vertical-align:middle;text-align:right">
<span style="font-size:14px;font-weight:700;color:${sc}">${opp.score}</span>
</td>
</tr></table></td></tr>`;
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(API_KEY)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const body: { mode: 'daily' | 'weekly' } = await req.json().catch(() => ({ mode: 'daily' }));
  const isWeekly = body.mode === 'weekly';

  const client = createClient({ baseUrl: OSS_HOST, apiKey: API_KEY });

  const { data: alertsData } = await client.database
    .from('pending_alerts')
    .select('*');

  const alerts = (alertsData ?? []) as Array<{
    id: string; user_id: string; score: number; platform_slug: string; title: string;
    opportunity_external_id: string; created_at: string;
  }>;

  const userGroup = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    const group = userGroup.get(alert.user_id) ?? [];
    group.push(alert);
    userGroup.set(alert.user_id, group);
  }

  const apiBase = `https://seerist.xyz`;
  let sent = 0;

  for (const [userId, userAlerts] of userGroup) {
    try {
      const { data: profile } = await client.database
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();

      const name = (profile as { full_name?: string } | null)?.full_name ?? 'there';

      const topOpps = userAlerts
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((a) => ({
          title: a.title,
          platform: a.platform_slug,
          score: a.score,
          url: `${apiBase}/opportunities?id=${a.opportunity_external_id}`,
        }));

      const highScore = userAlerts.filter((a) => a.score >= 70).length;
      const platformCounts = new Set(userAlerts.map((a) => a.platform_slug));
      const totalOpps = userAlerts.length;

      let html: string;
      let subject: string;

      if (isWeekly) {
        subject = `Your Seerist Weekly Digest — ${totalOpps} new opportunities`;
        html = wrap(`
          <p style="font-size:14px;color:${TXT2};margin:0 0 20px">Hi ${name}, here's your weekly roundup:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px"><tr>
            ${statBox(totalOpps, 'Opportunities', '+0% vs last week')}
            ${statBox(highScore, 'High Score (≥70)')}
            ${statBox(platformCounts.size, 'Platforms Scanned')}
          </tr></table>
          <h2 style="font-size:16px;font-weight:600;color:${TXT1};margin:0 0 8px">Top Opportunities</h2>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            ${topOpps.map(topCard).join('')}
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px"><tr><td>
            <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block"><tr><td align="center" style="border-radius:8px;background:${BRAND}">
              <a href="${apiBase}/opportunities" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px">View All ${totalOpps} Opportunities →</a>
            </td></tr></table>
          </td></tr></table>
          <p style="font-size:13px;color:${TXT3};margin-top:16px;padding-top:16px;border-top:1px solid ${BG}">
            💡 Pro tip: Opportunities with scores above 80 have the highest conversion rate. Focus your proposal efforts there.
          </p>
        `, subject);
      } else {
        subject = `Your Seerist Daily Digest — ${totalOpps} new opportunities`;
        html = wrap(`
          <p style="font-size:14px;color:${TXT2};margin:0 0 20px">Hi ${name}, here's what we found today:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px"><tr>
            ${statBox(totalOpps, 'Discovered')}
            ${statBox(highScore, 'High Score (≥70)')}
            ${statBox(platformCounts.size, 'Platforms Scanned')}
          </tr></table>
          <h2 style="font-size:16px;font-weight:600;color:${TXT1};margin:0 0 8px">Top Opportunities</h2>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            ${topOpps.map(topCard).join('')}
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px"><tr><td>
            <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block"><tr><td align="center" style="border-radius:8px;background:${BRAND}">
              <a href="${apiBase}/opportunities" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px">View All ${totalOpps} Opportunities →</a>
            </td></tr></table>
          </td></tr></table>
        `, subject);
      }

      const sendResp = await fetch(`${OSS_HOST}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({
          subject,
          html,
          from_name: 'Seerist',
          reply_to: 'support@seerist.xyz',
        }),
      });

      if (sendResp.ok) {
        await client.database.from('pending_alerts').delete().eq('user_id', userId);
        sent++;
      }
    } catch (err) {
      console.error(`Digest error for user ${userId}:`, err);
    }
  }

  return new Response(JSON.stringify({ sent, totalUsers: userGroup.size }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
