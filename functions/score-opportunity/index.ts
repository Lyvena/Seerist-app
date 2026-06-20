import { createClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const OSS_HOST = Deno.env.get('INSFORGE_BASE_URL')!;
const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY')!;

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const userToken = authHeader?.replace('Bearer ', '') ?? null;
  const client = createClient({ baseUrl: OSS_HOST, edgeFunctionToken: userToken });

  let body: {
    opportunity: { title: string; description: string; required_skills: string[]; budget_min: number | null; budget_max: number | null };
    product: { id: string; name: string; description: string; keywords: string[]; anti_keywords: string[] };
    user_id: string;
    custom_keywords?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { opportunity, product, user_id, custom_keywords } = body;

  const textForEmbedding = `${opportunity.title}\n${opportunity.description}`.slice(0, 8000);

  let embedding: number[] | null = null;
  try {
    const embedResp = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: textForEmbedding,
      }),
    });
    if (embedResp.ok) {
      const embedData = await embedResp.json();
      embedding = embedData.data?.[0]?.embedding ?? null;
    }
  } catch {
    // embedding is optional
  }

  const keywords = [...(product.keywords ?? []), ...(custom_keywords ?? [])];
  const antiKeywords = product.anti_keywords ?? [];

  const systemPrompt = `You are a business development scoring assistant. Analyze opportunities and return structured JSON only.`;

  const userPrompt = `Score this opportunity for selling our SaaS product.

PRODUCT: ${product.name}
What it does: ${product.description}
Target customer: ${product.description.slice(0, 200)}
Keywords to match: ${keywords.join(', ')}
Keywords to avoid: ${antiKeywords.join(', ')}

OPPORTUNITY:
Title: ${opportunity.title}
Description: ${(opportunity.description ?? '').slice(0, 2000)}
Budget: ${[opportunity.budget_min, opportunity.budget_max].filter((b) => b != null).join(' - ') || 'Not specified'}
Skills: ${(opportunity.required_skills ?? []).join(', ') || 'None listed'}

Score from 0-100 across 3 dimensions:
1. Relevance (0-100): How well does this opportunity fit our product?
2. Budget fit (0-100): Is the budget realistic for our pricing?
3. Timing (0-100): Is this a fresh, active opportunity worth pursuing?

Return JSON only:
{
  "total_score": <weighted average: relevance*0.6 + budget*0.2 + timing*0.2>,
  "relevance": <0-100>,
  "budget_fit": <0-100>,
  "timing": <0-100>,
  "reason": "<1 sentence plain-English explanation of the total score>",
  "is_disqualified": <true/false>
}`;

  let totalScore = 0;
  let relevance = 0;
  let budgetFit = 0;
  let timing = 0;
  let reason = '';
  let isDisqualified = false;

  try {
    const aiResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://seerist.xyz',
        'X-Title': 'Seerist',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    });

    if (aiResp.ok) {
      const aiData = await aiResp.json();
      const content = aiData.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content);

      totalScore = Math.round(parsed.total_score ?? 0);
      relevance = Math.round(parsed.relevance ?? 0);
      budgetFit = Math.round(parsed.budget_fit ?? 0);
      timing = Math.round(parsed.timing ?? 0);
      reason = parsed.reason ?? '';
      isDisqualified = parsed.is_disqualified ?? false;
    } else {
      const errText = await aiResp.text();
      return new Response(JSON.stringify({ error: 'AI scoring failed', detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'AI request failed', detail: (err as Error).message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    total_score: totalScore,
    relevance,
    budget_fit: budgetFit,
    timing,
    reason,
    is_disqualified: isDisqualified,
    embedding,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
