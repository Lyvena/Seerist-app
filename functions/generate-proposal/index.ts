import { createClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const userToken = authHeader?.replace('Bearer ', '') ?? null;

  const client = createClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL')!,
    edgeFunctionToken: userToken,
  });

  const { data: userData } = await client.auth.getCurrentUser();
  if (!userData?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const userId = userData.user.id;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const { opportunity_id, product_id, tone = 'professional', custom_instructions, regenerate } = body as {
    opportunity_id?: string; product_id?: string; tone?: string; custom_instructions?: string; regenerate?: boolean;
  };

  if (!opportunity_id || !product_id) {
    return new Response(JSON.stringify({ error: 'opportunity_id and product_id are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const [{ data: oppData }, { data: prodData }, { data: profileData }] = await Promise.all([
    client.database.from('opportunities').select('id, title, description, budget_min, budget_max, budget_currency, budget_type, required_skills, platform_id, platform:platforms!inner(name)').eq('id', opportunity_id).single(),
    client.database.from('products').select('id, name, description, key_benefits, pricing_model, price_point, target_customer').eq('id', product_id).single(),
    client.database.from('profiles').select('plan, ai_model').eq('id', userId).single(),
  ]);

  if (!oppData) return new Response(JSON.stringify({ error: 'Opportunity not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (!prodData) return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const plan = (profileData as Record<string, unknown>)?.plan ?? 'free';
  const userModel = (profileData as Record<string, unknown>)?.ai_model ?? (plan === 'free' ? 'openai/gpt-4o-mini' : 'openai/gpt-4o');
  const platform = Array.isArray(oppData.platform) ? (oppData.platform as Array<Record<string, unknown>>)[0] : oppData.platform;
  const opp = oppData as Record<string, unknown>;
  const prod = prodData as Record<string, unknown>;

  const benefits = (prod.key_benefits as string[] | null)?.join(', ') || 'Various benefits';
  const pricing = [prod.pricing_model, prod.price_point].filter(Boolean).join(' at ') || 'Contact for pricing';

  const systemPrompt = `You are an expert sales copywriter specializing in proposals for SaaS products and digital tools sold through freelance platforms. Your proposals are concise, specific, and focused on the client's problem — not the product's features.`;

  const instructionsExtra = custom_instructions ? `\n- Additional context: ${custom_instructions}` : '';

  const userPrompt = `Write a ${tone} freelance proposal to win this job posting.

PLATFORM: ${(platform as Record<string, unknown>)?.name ?? 'Unknown'}

JOB POSTING:
Title: ${opp.title}
Description: ${opp.description}
Budget: ${[opp.budget_min, opp.budget_max, opp.budget_type].filter(Boolean).join(' ') || 'Not specified'}

OUR PRODUCT/TOOL:
Name: ${prod.name}
Description: ${prod.description}
Key Benefits: ${benefits}
Pricing: ${pricing}
Ideal for: ${prod.target_customer ?? 'Various'}

INSTRUCTIONS:
- Open with a hook that shows you understand their exact problem
- Position our tool as the ideal solution (not just 'I can do this')
- Mention 1-2 specific benefits most relevant to their use case
- Keep it under 250 words for the ${(platform as Record<string, unknown>)?.name ?? 'platform'} audience
- End with a clear call to action
- Do NOT use bullet points — write in flowing paragraphs${instructionsExtra}

Return ONLY the proposal text. No preamble, no labels, no markdown.`;

  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openRouterKey) {
    return new Response(JSON.stringify({ error: 'AI gateway not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const aiResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://seerist.xyz',
      'X-Title': 'Seerist',
    },
    body: JSON.stringify({
      model: userModel,
      messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt } ],
      max_tokens: 600,
      stream: true,
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    return new Response(JSON.stringify({ error: 'AI generation failed', detail: errText }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const [forClient, forSave] = aiResp.body!.tee();

  (async () => {
    const reader = forSave.getReader();
    const decoder = new TextDecoder();
    let proposalText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const json = trimmed.slice(6);
        if (json === '[DONE]') continue;
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content ?? '';
          proposalText += content;
        } catch {}
      }
    }

    if (proposalText) {
      const wordCount = proposalText.split(/\s+/).filter(Boolean).length;

      const { data: existing } = await client.database.from('proposals').select('version').eq('opportunity_id', opportunity_id).eq('user_id', userId).order('version', { ascending: false }).limit(1);
      const currentVersion = ((existing ?? []) as { version: number }[])[0]?.version ?? 0;
      const version = regenerate ? currentVersion + 1 : Math.max(currentVersion, 1);

      await client.database.from('proposals').insert([{
        user_id: userId,
        opportunity_id,
        product_id,
        content: proposalText,
        version,
        tone,
        word_count: wordCount,
        is_ai_generated: true,
        model_used: userModel,
        generation_prompt: userPrompt.slice(0, 500),
      } as Record<string, unknown>]);

      await client.database.from('opportunities').update({ status: 'proposing', updated_at: new Date().toISOString() }).eq('id', opportunity_id).eq('status', 'new');

      await client.database.from('activity_log').insert([{
        user_id: userId,
        entity_type: 'proposal',
        entity_id: opportunity_id,
        action: 'generated',
        metadata: { version, tone, word_count: wordCount, model: userModel },
      } as Record<string, unknown>]);
    }
  })();

  const sseStream = new ReadableStream({
    async start(controller) {
      const reader = forClient.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const json = trimmed.slice(6);
          if (json === '[DONE]') continue;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content ?? '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          } catch {}
        }
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      controller.close();
    },
  });

  return new Response(sseStream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
