import { createClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const OSS_HOST = Deno.env.get('INSFORGE_BASE_URL')!;

interface RawOpportunity {
  external_id: string;
  title: string;
  description: string;
  poster_name: string | null;
  poster_company: string | null;
  post_url: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string | null;
  budget_type: string | null;
  required_skills: string[];
  location: string | null;
  is_remote: boolean;
  posted_at: string | null;
  raw_data: Record<string, unknown>;
}

async function scrapeWeWorkRemotely(): Promise<RawOpportunity[]> {
  const resp = await fetch('https://weworkremotely.com/remote-jobs.rss');
  if (!resp.ok) return [];
  const xml = await resp.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  return items.map((item: string): RawOpportunity => {
    const extract = (tag: string) => {
      const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].trim() : '';
    };

    const title = extract('title');
    const description = extract('description').replace(/<[^>]+>/g, '').trim();
    const link = extract('link');
    const pubDate = extract('pubDate');
    const categoryMatch = item.match(/<category>([^<]+)<\/category>/g);
    const categories = categoryMatch ? categoryMatch.map((c: string) => c.replace(/<\/?category>/g, '').trim()) : [];
    const externalId = `wwr-${btoa(link).slice(0, 20)}`;

    return {
      external_id: externalId,
      title,
      description: description.slice(0, 3000),
      poster_name: null,
      poster_company: null,
      post_url: link,
      budget_min: null,
      budget_max: null,
      budget_currency: null,
      budget_type: null,
      required_skills: categories,
      location: 'Remote',
      is_remote: true,
      posted_at: pubDate ? new Date(pubDate).toISOString() : null,
      raw_data: { source: 'weworkremotely', categories },
    };
  });
}

async function scrapeRemoteOK(): Promise<RawOpportunity[]> {
  const resp = await fetch('https://remoteok.com/api');
  if (!resp.ok) return [];
  const data = await resp.json();

  if (!Array.isArray(data)) return [];

  return data.slice(1).map((job: Record<string, unknown>): RawOpportunity => {
    const dateStr = (job.date as string) ?? '';
    const tags = (job.tags as string[]) ?? [];
    const slug = job.slug as string;

    return {
      external_id: `rok-${slug}`,
      title: (job.position as string) ?? '',
      description: ((job.description as string) ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 3000),
      poster_name: (job.company as string) ?? null,
      poster_company: (job.company as string) ?? null,
      post_url: `https://remoteok.com/remote-jobs/${slug}`,
      budget_min: null,
      budget_max: null,
      budget_currency: 'USD',
      budget_type: null,
      required_skills: tags,
      location: 'Remote',
      is_remote: true,
      posted_at: dateStr ? new Date(dateStr).toISOString() : null,
      raw_data: job as Record<string, unknown>,
    };
  });
}

async function scrapeUpwork(product: { name: string; keywords: string[] }): Promise<RawOpportunity[]> {
  try {
    const encoded = encodeURIComponent([product.name, ...product.keywords].slice(0, 3).join(' '));
    const url = `https://www.upwork.com/ab/feed/jobs/rss?q=${encoded}&sort=recency&paging=0`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) return [];

    const xml = await resp.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

    return items.map((item: string): RawOpportunity => {
      const extract = (tag: string) => {
        const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? m[1].trim() : '';
      };

      const title = extract('title');
      const description = extract('description').replace(/<[^>]+>/g, '').trim();
      const link = extract('link');
      const externalId = `upw-${btoa(link).slice(0, 24)}`;

      const budgetMatch = description.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/);
      let budgetMin: number | null = null;
      let budgetMax: number | null = null;
      if (budgetMatch) {
        const parts = budgetMatch[0].replace(/\$/g, '').split('-').map((s) => parseFloat(s.replace(/,/g, '').trim()));
        budgetMin = parts[0] || null;
        budgetMax = parts[1] || null;
      }

      const skills: string[] = [];
      const dc = extract('dc:subject');
      if (dc) skills.push(...dc.split(',').map((s) => s.trim()));

      return {
        external_id: externalId,
        title,
        description: description.slice(0, 3000),
        poster_name: null,
        poster_company: null,
        post_url: link,
        budget_min: budgetMin,
        budget_max: budgetMax,
        budget_currency: 'USD',
        budget_type: 'fixed',
        required_skills: skills,
        location: 'Remote',
        is_remote: true,
        posted_at: extract('pubDate') ? new Date(extract('pubDate')).toISOString() : null,
        raw_data: { source: 'upwork' },
      };
    });
  } catch {
    return [];
  }
}

async function scrapeFreelancer(product: { name: string; keywords: string[] }): Promise<RawOpportunity[]> {
  try {
    const query = encodeURIComponent([product.name, ...product.keywords].slice(0, 3).join(' '));
    const url = `https://www.freelancer.com/api/projects/0.1/projects/active/?query=${query}&limit=20&sort_field=submit_date&sort_order=DESC`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) return [];

    const data = await resp.json();
    const projects = (data as Record<string, unknown>)?.result?.projects as Array<Record<string, unknown>> | undefined;
    if (!projects) return [];

    return projects.map((project: Record<string, unknown>): RawOpportunity => {
      const bidStats = project.bid_stats as Record<string, unknown> ?? {};
      const seoUrl = project.seo_url as string ?? '';
      const skills = ((project.jobs as Array<Record<string, unknown>>) ?? []).map((j) => j.name as string);

      return {
        external_id: `fl-${project.id}`,
        title: (project.title as string) ?? '',
        description: ((project.description as string) ?? '').slice(0, 3000),
        poster_name: (project.owner_id as string) ?? null,
        poster_company: null,
        post_url: `https://www.freelancer.com/projects/${seoUrl}`,
        budget_min: (bidStats?.budget_min as number) ?? null,
        budget_max: (bidStats?.budget_max as number) ?? null,
        budget_currency: (project.currency as Record<string, unknown>)?.code as string ?? 'USD',
        budget_type: 'fixed',
        required_skills: skills,
        location: (project.location as Record<string, unknown>)?.name as string ?? null,
        is_remote: (project.type as string)?.toLowerCase() === 'contest' ? false : true,
        posted_at: (project.submit_date as string) ?? null,
        raw_data: project as Record<string, unknown>,
      };
    });
  } catch {
    return [];
  }
}

const ADAPTERS: Record<string, (product: { name: string; keywords: string[] }) => Promise<RawOpportunity[]>> = {
  weworkremotely: async () => scrapeWeWorkRemotely(),
  remoteok: async () => scrapeRemoteOK(),
  upwork: scrapeUpwork,
  freelancer: scrapeFreelancer,
};

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const userToken = authHeader?.replace('Bearer ', '') ?? null;
  const client = createClient({ baseUrl: OSS_HOST, edgeFunctionToken: userToken });

  let body: {
    user_id: string;
    platform_slug: string;
    product: { id: string; name: string; description: string; keywords: string[]; anti_keywords: string[] };
    config: { min_score: number; auto_propose: boolean; custom_keywords: string[] };
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (!body.user_id || !body.platform_slug) {
    return new Response(JSON.stringify({ error: 'user_id and platform_slug required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const adapter = ADAPTERS[body.platform_slug];
  if (!adapter) {
    return new Response(JSON.stringify({ opportunities: [], platform: body.platform_slug, note: 'no adapter' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawOpps = await adapter(body.product);

  const { data: platformsData } = await client.database
    .from('platforms')
    .select('id')
    .eq('slug', body.platform_slug)
    .single();

  const platformRow = platformsData as { id: string } | null;
  if (!platformRow) {
    return new Response(JSON.stringify({ error: 'Platform not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: existing } = await client.database
    .from('opportunities')
    .select('external_id')
    .eq('user_id', body.user_id)
    .eq('platform_id', platformRow.id);

  const existingIds = new Set(((existing ?? []) as Array<{ external_id: string }>).map((o) => o.external_id));
  const newOpps = rawOpps.filter((o) => !existingIds.has(o.external_id));

  let scored = 0;
  let inserted = 0;

  for (const opp of newOpps) {
    const scoreUrl = `${OSS_HOST}/functions/score-opportunity`;
    const scoreResp = await fetch(scoreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader ?? '' },
      body: JSON.stringify({
        opportunity: {
          title: opp.title,
          description: opp.description,
          required_skills: opp.required_skills,
          budget_min: opp.budget_min,
          budget_max: opp.budget_max,
        },
        product: body.product,
        user_id: body.user_id,
        custom_keywords: body.config.custom_keywords,
      }),
    });

    scored++;

    if (!scoreResp.ok) continue;

    const scoreData = await scoreResp.json();
    if (scoreData.is_disqualified) continue;
    if (scoreData.total_score < (body.config.min_score ?? 60)) continue;

    const oppWithPlatform = {
      ...opp,
      user_id: body.user_id,
      product_id: body.product.id,
      platform_id: platformRow.id,
      ai_score: Math.round(scoreData.total_score),
      ai_score_reason: scoreData.reason ?? null,
      ai_score_breakdown: {
        relevance: scoreData.relevance ?? 0,
        budget_fit: scoreData.budget_fit ?? 0,
        timing: scoreData.timing ?? 0,
      },
      embedding: scoreData.embedding ?? null,
      status: 'new',
    };

    const { error: insertErr } = await client.database.from('opportunities').insert([oppWithPlatform]);

    if (!insertErr) {
      inserted++;

      await client.database.from('activity_log').insert([{
        user_id: body.user_id,
        entity_type: 'opportunity',
        entity_id: oppWithPlatform.external_id,
        action: 'scored',
        metadata: { platform: body.platform_slug, score: scoreData.total_score, title: opp.title },
      }]);

      fetch(`${OSS_HOST}/functions/send-opportunity-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader ?? '' },
        body: JSON.stringify({
          user_id: body.user_id,
          opportunity_external_id: oppWithPlatform.external_id,
          platform_slug: body.platform_slug,
          score: scoreData.total_score,
          title: opp.title,
          description: opp.description,
          budget: `${[opp.budget_min, opp.budget_max].filter((b) => b != null).join(' - ') || 'N/A'}`,
          keywords: [...(body.product.keywords ?? []), ...(body.config.custom_keywords ?? [])],
        }),
      }).catch(() => {});

      if (body.config.auto_propose && scoreData.total_score >= 80) {
        const proposalUrl = `${OSS_HOST}/functions/generate-proposal`;
        fetch(proposalUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader ?? '' },
          body: JSON.stringify({
            opportunity_id: oppWithPlatform.external_id,
            product_id: body.product.id,
            tone: 'professional',
            auto_generated: true,
          }),
        }).catch(() => {});
      }
    }
  }

  return new Response(JSON.stringify({
    platform: body.platform_slug,
    raw_found: rawOpps.length,
    new_candidates: newOpps.length,
    scored,
    inserted,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
