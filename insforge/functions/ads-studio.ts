// @include _shared
// ============================================================================
// ads-studio — Module C, ad creative generation and campaign management.
//
// Spec §4 Module C: "generates ad creative, manages campaigns, and provides
// full-funnel attribution back through the same touchpoint model used for
// bid-driven signups."
//
// Attribution deliberately reuses growth_touchpoints. A campaign gets a
// touchpoint row (source='ad', campaign_id set, proposal_id null) and its id is
// the ?seerist_ref value you put on the ad's landing URL — so an ad-driven
// signup and a bid-driven signup land in exactly one model, and
// analytics/growth-feedback see both without special-casing.
//
// Creative lands in growth_content_drafts as a DRAFT. Campaign records are
// managed here; pushing a campaign to an external ad network requires that
// network's own connection and is reported as not-connected rather than faked.
//
// Operations (POST { op, ... }):
//   create_campaign     { workspace_id, name, platform, objective, daily_budget, targeting }
//   update_campaign     { campaign_id, status?, daily_budget?, targeting?, name? }
//   list_campaigns      { workspace_id }
//   generate_creative   { workspace_id, campaign_id?, brief, count? }
//   attribution_report  { workspace_id }
// ============================================================================

const AD_PLATFORMS = ['meta', 'google', 'linkedin', 'reddit', 'x'];
const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'ended'];

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
      case 'create_campaign':
        return await createCampaign(body, token, userId);
      case 'update_campaign':
        return await updateCampaign(body, token, userId);
      case 'list_campaigns':
        return await listCampaigns(body, token);
      case 'generate_creative':
        return await generateCreative(body, token, userId);
      case 'attribution_report':
        return await attributionReport(body, token);
      default:
        return json({
          error: 'op must be one of: create_campaign, update_campaign, list_campaigns, generate_creative, attribution_report',
        }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'ads-studio failed' }, 500);
  }
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

async function createCampaign(body: any, token: string, userId: string | null): Promise<Response> {
  const { workspace_id, name } = body;
  if (!workspace_id || !name) return json({ error: 'workspace_id and name are required' }, 400);

  const platform = AD_PLATFORMS.includes(body.platform) ? body.platform : 'meta';
  const [campaign] = await dbInsert('ad_campaigns', [{
    workspace_id,
    name: String(name).slice(0, 200),
    platform,
    objective: body.objective ? String(body.objective).slice(0, 300) : null,
    status: 'draft',
    daily_budget: Number.isFinite(Number(body.daily_budget)) ? Number(body.daily_budget) : null,
    targeting: body.targeting && typeof body.targeting === 'object' ? body.targeting : {},
    created_by: userId,
  }], token);

  // One touchpoint per campaign — the shared attribution primitive.
  const [touchpoint] = await dbInsert('growth_touchpoints', [{
    workspace_id,
    proposal_id: null,
    campaign_id: campaign.id,
    source: 'ad',
    product_mentioned: true,
    mention_policy: 'link_allowed',
  }], token);

  await logPersona({
    workspace_id,
    persona: 'The Grower',
    action: 'create_ad_campaign',
    params: { campaign_id: campaign.id, platform, touchpoint_id: touchpoint.id },
    result: `Created campaign "${campaign.name}" on ${platform} with attribution ref ${touchpoint.id}.`,
    created_by: userId,
  }, token);

  return json({ campaign, touchpoint, attribution_ref: touchpoint.id }, 201);
}

async function updateCampaign(body: any, token: string, userId: string | null): Promise<Response> {
  const { campaign_id } = body;
  if (!campaign_id) return json({ error: 'campaign_id is required' }, 400);

  const current = (await dbSelect('ad_campaigns', `id=eq.${campaign_id}&limit=1`, token))[0];
  if (!current) return json({ error: 'Campaign not found' }, 404);

  const patch: Record<string, unknown> = {};
  if (body.name) patch.name = String(body.name).slice(0, 200);
  if (CAMPAIGN_STATUSES.includes(body.status)) patch.status = body.status;
  if (body.objective !== undefined) patch.objective = body.objective ? String(body.objective).slice(0, 300) : null;
  if (Number.isFinite(Number(body.daily_budget))) patch.daily_budget = Number(body.daily_budget);
  if (body.targeting && typeof body.targeting === 'object') patch.targeting = body.targeting;
  if (!Object.keys(patch).length) return json({ error: 'Nothing to update' }, 400);

  const [campaign] = await dbPatch('ad_campaigns', `id=eq.${campaign_id}`, patch, token);

  await logPersona({
    workspace_id: current.workspace_id,
    persona: 'The Grower',
    action: 'update_ad_campaign',
    params: { campaign_id, changes: Object.keys(patch) },
    result: `Campaign "${campaign.name}" is now ${campaign.status}.`,
    created_by: userId,
  }, token);

  // Seerist tracks campaign state; it does not push to an ad network unless
  // that network is connected. Say so plainly rather than implying it shipped.
  return json({
    campaign,
    externalSync: {
      connected: false,
      note: `Campaign state is recorded in Seerist. Pushing "${campaign.status}" to ${campaign.platform} requires connecting that ad account — no external ad-network credentials are configured, so nothing was sent.`,
    },
  });
}

async function listCampaigns(body: any, token: string): Promise<Response> {
  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);

  const campaigns = await dbSelect(
    'ad_campaigns',
    `workspace_id=eq.${workspace_id}&order=created_at.desc&limit=100`,
    token,
  );
  if (!campaigns.length) return json({ campaigns: [] });

  const touchpoints = await dbSelect(
    'growth_touchpoints',
    `workspace_id=eq.${workspace_id}&source=eq.ad&limit=500`,
    token,
  );

  return json({
    campaigns: campaigns.map((c: any) => {
      const tps = touchpoints.filter((t: any) => t.campaign_id === c.id);
      return {
        ...c,
        attribution_ref: tps[0]?.id ?? null,
        attributed_signups: tps.filter((t: any) => t.attributed_signup_id).length,
      };
    }),
  });
}

// ---------------------------------------------------------------------------
// Creative generation
// ---------------------------------------------------------------------------

async function generateCreative(body: any, token: string, userId: string | null): Promise<Response> {
  const { workspace_id, brief } = body;
  if (!workspace_id || !brief) return json({ error: 'workspace_id and brief are required' }, 400);

  const ws = (await dbSelect('workspaces', `id=eq.${workspace_id}&limit=1`, token))[0];
  if (!ws) return json({ error: 'Workspace not found' }, 404);

  const campaign = body.campaign_id
    ? (await dbSelect('ad_campaigns', `id=eq.${body.campaign_id}&limit=1`, token))[0]
    : null;
  const count = Math.min(Math.max(Number(body.count) || 3, 1), 6);

  const ingested = await dbSelect(
    'site_ingestion_jobs',
    `workspace_id=eq.${workspace_id}&status=eq.complete&order=created_at.desc&limit=2`,
    token,
  );
  const positioning = ingested.map((j: any) => j.positioning).filter(Boolean).join('\n') || '(not ingested yet)';

  const raw = await aiChat([
    {
      role: 'system',
      content: `You are The Grower writing ${count} distinct ad creative variants. Each must take a genuinely different angle (not reworded copies). Never claim a capability, statistic, customer or outcome that the positioning does not support. No fake urgency, no invented social proof.
Respond with STRICT JSON: {"variants": [{"angle": "<the distinct angle>", "headline": "<<=40 chars>", "primary_text": "<<=125 chars>", "description": "<<=30 chars>", "cta": "<button label>"}]}`,
    },
    {
      role: 'user',
      content: `WORKSPACE: ${ws.name}
Product: ${ws.product_name || '(none)'} — ${ws.product_description || 'no description on file'}
Target customer: ${ws.target_customer || 'unspecified'}
Tone: ${ws.tone_style || 'neutral professional'}
Platform: ${campaign?.platform || body.platform || 'meta'}
Campaign objective: ${campaign?.objective || '(none set)'}

POSITIONING:
${positioning}

BRIEF: ${brief}`,
    },
  ], token, { maxTokens: 1600, temperature: 0.6 });

  const parsed = parseJsonLoose(raw);
  const variants = (Array.isArray(parsed.variants) ? parsed.variants : []).slice(0, count);
  if (!variants.length) return json({ error: 'Creative generation returned no variants' }, 502);

  const drafts = await dbInsert('growth_content_drafts', variants.map((v: any) => ({
    workspace_id,
    kind: 'ad_creative',
    title: String(v.headline || 'Ad creative').slice(0, 300),
    body: String(v.primary_text || ''),
    meta: {
      angle: String(v.angle || '').slice(0, 300),
      description: String(v.description || '').slice(0, 200),
      cta: String(v.cta || 'Learn more').slice(0, 60),
      platform: campaign?.platform || body.platform || 'meta',
      campaign_id: campaign?.id ?? null,
    },
    evidence: { brief: String(brief).slice(0, 1000), positioning_used: Boolean(ingested.length) },
    source: 'ads-studio:generate_creative',
    status: 'draft',
    created_by: userId,
  })), token);

  await logPersona({
    workspace_id,
    persona: 'The Grower',
    action: 'generate_ad_creative',
    params: { campaign_id: campaign?.id ?? null, variants: drafts.length },
    result: `Drafted ${drafts.length} ad variant(s). Drafts only — nothing was launched.`,
    created_by: userId,
  }, token);

  return json({ drafts }, 201);
}

// ---------------------------------------------------------------------------
// Full-funnel attribution across bids AND ads — one shared model
// ---------------------------------------------------------------------------

async function attributionReport(body: any, token: string): Promise<Response> {
  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);

  const [touchpoints, signups, campaigns] = await Promise.all([
    dbSelect('growth_touchpoints', `workspace_id=eq.${workspace_id}&limit=1000`, token),
    dbSelect('product_signups', `workspace_id=eq.${workspace_id}&limit=1000`, token),
    dbSelect('ad_campaigns', `workspace_id=eq.${workspace_id}&limit=100`, token),
  ]);

  const bySource = (src: string) => touchpoints.filter((t: any) => (t.source || 'bid') === src);
  const attributed = (rows: any[]) => rows.filter((t: any) => t.attributed_signup_id).length;

  const bid = bySource('bid');
  const ad = bySource('ad');
  const site = bySource('site');

  const spend = campaigns.reduce((sum: number, c: any) => sum + (Number(c.daily_budget) || 0), 0);
  const adSignups = attributed(ad);

  return json({
    funnel: {
      bid: { touchpoints: bid.length, attributed_signups: attributed(bid) },
      ad: { touchpoints: ad.length, attributed_signups: adSignups },
      site: { touchpoints: site.length, attributed_signups: attributed(site) },
    },
    totals: {
      touchpoints: touchpoints.length,
      attributed_signups: attributed(touchpoints),
      total_signups: signups.length,
      organic_signups: signups.filter((s: any) => s.source !== 'bid_touchpoint').length,
    },
    campaigns: campaigns.map((c: any) => {
      const tps = ad.filter((t: any) => t.campaign_id === c.id);
      return {
        id: c.id,
        name: c.name,
        platform: c.platform,
        status: c.status,
        daily_budget: c.daily_budget,
        attributed_signups: attributed(tps),
      };
    }),
    cost_note: spend > 0 && adSignups > 0
      ? `Daily budget across campaigns is ${spend.toFixed(2)}; ${adSignups} attributed signup(s) so far. Cost per acquisition needs real spend data from the ad network to be exact — this is budget, not spend.`
      : 'Cost per acquisition needs real spend figures from the connected ad network; only budgets are recorded here.',
  });
}
