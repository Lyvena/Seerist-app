import { createClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const OSS_HOST = Deno.env.get('INSFORGE_BASE_URL')!;

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const rawToken = authHeader?.replace('Bearer ', '') ?? null;

  const isApiKey = rawToken?.startsWith('ik_');
  const client = isApiKey
    ? createClient({ baseUrl: OSS_HOST, apiKey: rawToken! })
    : createClient({ baseUrl: OSS_HOST, edgeFunctionToken: rawToken });

  let body: { user_id?: string; platform_slug?: string };
  try { body = await req.json(); } catch {
    body = {};
  }

  let callerUserId: string | null = body.user_id ?? null;

  if (!isApiKey && !callerUserId) {
    const { data: userData } = await (client as ReturnType<typeof createClient>).auth.getCurrentUser();
    callerUserId = userData?.user?.id ?? null;
  }

  const users: Array<{ id: string }> = [];
  if (callerUserId && !isApiKey) {
    users.push({ id: callerUserId });
  } else {
    const { data: allUsers } = await client.database
      .from('profiles')
      .select('id')
      .eq('onboarding_completed', true)
      .limit(250);

    const fetched = (allUsers ?? []) as Array<{ id: string }>;
    for (let i = 0; i < fetched.length; i += 50) {
      users.push(...fetched.slice(i, i + 50));
    }
  }

  let dispatched = 0;

  for (const user of users) {
    const { data: configs } = await client.database
      .from('user_platform_configs')
      .select('platform_id, min_score, auto_propose, custom_keywords')
      .eq('user_id', user.id)
      .eq('is_enabled', true);

    const userConfigs = (configs ?? []) as Array<{
      platform_id: string;
      min_score: number;
      auto_propose: boolean;
      custom_keywords: string[];
    }>;

    if (userConfigs.length === 0) continue;

    const platformIds = userConfigs.map((c) => c.platform_id);

    const { data: platformsData } = await client.database
      .from('platforms')
      .select('id, slug')
      .in('id', platformIds);

    const platforms = (platformsData ?? []) as Array<{ id: string; slug: string }>;

    if (body.platform_slug) {
      const filtered = platforms.filter((p) => p.slug === body.platform_slug);
      platforms.length = 0;
      platforms.push(...filtered);
    }

    if (platforms.length === 0) continue;

    const { data: productsData } = await client.database
      .from('products')
      .select('id, name, description, keywords, anti_keywords')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    const products = (productsData ?? []) as Array<{
      id: string;
      name: string;
      description: string;
      keywords: string[];
      anti_keywords: string[];
    }>;

    if (products.length === 0) continue;

    const product = products[0];

    for (const platform of platforms) {
      const config = userConfigs.find((c) => c.platform_id === platform.id);
      if (!config) continue;

      const scrapeUrl = `${OSS_HOST}/functions/scrape-platform`;
      const payload = {
        user_id: user.id,
        platform_slug: platform.slug,
        product: { id: product.id, name: product.name, description: product.description, keywords: product.keywords ?? [], anti_keywords: product.anti_keywords ?? [] },
        config: { min_score: config.min_score ?? 60, auto_propose: config.auto_propose ?? false, custom_keywords: config.custom_keywords ?? [] },
      };

      fetch(scrapeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader ?? '' },
        body: JSON.stringify(payload),
      }).catch(() => {});

      dispatched++;
    }
  }

  return new Response(JSON.stringify({ dispatched, users: users.length }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
