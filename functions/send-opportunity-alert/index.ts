import { createClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const OSS_HOST = Deno.env.get('INSFORGE_BASE_URL')!;
const API_KEY = Deno.env.get('INSFORGE_API_KEY')!;

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let body: {
    user_id: string;
    opportunity_external_id: string;
    platform_slug: string;
    score: number;
    title: string;
    description?: string;
    budget?: string;
    keywords?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { user_id, score, platform_slug, title, description, budget, keywords, opportunity_external_id } = body;

  const client = createClient({ baseUrl: OSS_HOST, apiKey: API_KEY });

  const { data: preferences } = await client.database
    .from('alert_preferences')
    .select('digest_frequency, min_score_for_alert')
    .eq('user_id', user_id)
    .maybeSingle();

  const prefs = preferences as { digest_frequency?: string; min_score_for_alert?: number } | null;
  const digestFrequency = prefs?.digest_frequency ?? 'realtime';
  const minScore = prefs?.min_score_for_alert ?? 60;

  if (score < minScore) {
    return new Response(JSON.stringify({ skipped: true, reason: 'below_min_score' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (digestFrequency !== 'realtime') {
    await client.database.from('pending_alerts').insert([{
      user_id,
      opportunity_external_id,
      score,
      platform_slug,
      title,
      created_at: new Date().toISOString(),
    }]);

    return new Response(JSON.stringify({ queued: true, digest: digestFrequency }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: profile } = await client.database
    .from('profiles')
    .select('full_name')
    .eq('id', user_id)
    .maybeSingle();

  if ((profile as { full_name?: string } | null)?.full_name === undefined) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const subject = `${score}-score match on ${platform_slug}: ${title.slice(0, 60)}`;
  const desc = (description ?? '').length > 150 ? (description ?? '').slice(0, 150) + '...' : (description ?? '');
  const kw = (keywords ?? []).join(', ');
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#7C3AED' : '#F59E0B';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" style="max-width:560px">
<tr><td style="padding:24px;background:#FFFFFF;border-radius:12px">
<p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#7C3AED;margin:0 0 4px">New Opportunity Found</p>
<h1 style="font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 4px;line-height:1.3">${title}</h1>
<p style="font-size:13px;color:#6B7280;margin:0 0 16px">on ${platform_slug}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px"><tr>
<td style="vertical-align:middle;padding-right:12px">
<div style="width:48px;height:48px;border-radius:50%;background:${scoreColor}15;display:flex;align-items:center;justify-content:center;text-align:center">
<span style="font-size:16px;font-weight:700;color:${scoreColor}">${score}</span></div></td>
<td style="vertical-align:middle;font-size:13px;color:#6B7280">
<strong style="color:#1A1A2E">Match Score</strong><br/>out of 100</td>
</tr></table>
<p style="font-size:14px;color:#6B7280;line-height:1.6;margin:0 0 16px">${desc}</p>
<p style="font-size:13px;color:#6B7280;margin:0 0 4px"><strong style="color:#1A1A2E">Budget:</strong> ${budget ?? 'N/A'}</p>
${kw ? `<p style="font-size:13px;color:#6B7280;margin:0 0 20px"><strong style="color:#1A1A2E">Matched Keywords:</strong> ${kw}</p>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:8px">
<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block">
<tr><td align="center" style="border-radius:8px;background:#7C3AED">
<a href="https://seerist.xyz/proposals/generate?opportunity_external_id=${opportunity_external_id}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px">Generate Proposal →</a>
</td></tr></table></td>
<td>
<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block">
<tr><td align="center" style="border-radius:8px;border:1.5px solid #7C3AED">
<a href="https://seerist.xyz/opportunities?id=${opportunity_external_id}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#7C3AED;text-decoration:none;border-radius:8px">View Opportunity →</a>
</td></tr></table></td>
</tr></table>
</td></tr>
<tr><td style="padding-top:24px;text-align:center;font-size:12px;color:#9CA3AF">
<p style="margin:0 0 4px">Seerist — AI-powered freelance opportunity matching</p>
<p style="margin:0"><a href="https://seerist.xyz/settings/alerts" style="color:#7C3AED;text-decoration:underline">Manage alert preferences</a></p>
</td></tr>
</table></td></tr></table></body></html>`;

  try {
    const sendResp = await fetch(`${OSS_HOST}/api/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        to: [], // resolved from user token
        subject,
        html,
        from_name: 'Seerist',
        reply_to: 'support@seerist.xyz',
      }),
    });

    if (!sendResp.ok) {
      const errText = await sendResp.text();
      console.error('Email send failed:', errText);
    }
  } catch (err) {
    console.error('Email send error:', err);
  }

  await client.database.from('notifications').insert([{
    user_id,
    type: 'new_opportunity',
    title: `New ${score}-score match on ${platform_slug}`,
    body: title.slice(0, 120),
    link: `/opportunities?id=${opportunity_external_id}`,
  }]);

  return new Response(JSON.stringify({ sent: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
