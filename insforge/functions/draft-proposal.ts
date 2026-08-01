// @include _shared
// ============================================================================
// draft-proposal — Module A AI drafting via the InsForge model gateway.
// Agency mode: tone/style matched to the workspace profile, referencing past
// work. SaaS mode: adds product-mention logic driven by the manually curated,
// versioned per-platform policy_configs row. A platform WITHOUT a configured
// row defaults to 'no_mention' — policy is never auto-inferred from ToS text.
// ============================================================================

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
  const { proposal_id } = body;
  if (!proposal_id) return json({ error: 'proposal_id is required' }, 400);

  try {
    const proposal = (await dbSelect('proposals', `id=eq.${proposal_id}&limit=1`, token))[0];
    if (!proposal) return json({ error: 'Proposal not found' }, 404);
    const job = (await dbSelect('job_postings', `id=eq.${proposal.job_posting_id}&limit=1`, token))[0];
    const ws = (await dbSelect('workspaces', `id=eq.${proposal.workspace_id}&limit=1`, token))[0];
    if (!job || !ws) return json({ error: 'Job or workspace not found' }, 404);

    // Manually curated per-platform mention policy; absent row => no_mention.
    let mentionPolicy = 'no_mention';
    let policyVersion = 0;
    if (ws.type === 'saas') {
      const pc = (await dbSelect(
        'policy_configs',
        `platform=eq.${encodeURIComponent(job.platform)}&limit=1`,
        token,
      ))[0];
      if (pc) {
        mentionPolicy = pc.mention_policy;
        policyVersion = pc.version;
      }
    }

    // Hermes-style workspace memory grounds the draft (tone, positioning, prior
    // decisions). Ingested product documentation is read separately from the
    // recency window: every delivery run writes a memory of its own, so on a
    // busy workspace the docs would otherwise be pushed out of the context that
    // the product-mention rules above depend on.
    const wsFilter = `workspace_id=eq.${proposal.workspace_id}`;
    const [productDocs, recent] = await Promise.all([
      dbSelect('workspace_memories', `${wsFilter}&key=like.product_docs_*&order=updated_at.desc&limit=4`, token),
      dbSelect('workspace_memories', `${wsFilter}&order=updated_at.desc&limit=12`, token),
    ]);
    const seen = new Set<string>();
    const memories = [...productDocs, ...recent].filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    const memoryBlock = memories.length
      ? memories.map((m: any) => `- [${m.kind}] ${m.key}: ${m.content.slice(0, 400)}`).join('\n')
      : '(no stored memories yet)';

    const mentionRules: Record<string, string> = {
      link_allowed: `You MAY mention the product "${ws.product_name}" once, naturally, where it strengthens the pitch, and MAY include its URL (${ws.product_url}) once.`,
      description_only: `You MAY describe the product "${ws.product_name}" in one natural sentence where relevant, but MUST NOT include any URL or link.`,
      no_mention: 'You MUST NOT mention, describe, or allude to any product of ours. Pure services pitch.',
    };

    const system = `You are The Drafter, Seerist's proposal writer.
Write a winning, policy-compliant freelance proposal. Hard rules:
- Open with a specific insight about THIS job (never "I read your post").
- Match the workspace's tone/style. Reference relevant past work briefly when available.
- Under 260 words. No AI/bot/automation mentions. No contact info outside the platform.
- End with one clear next step (a question, a short call, or a first milestone).
${ws.type === 'saas' ? `- PRODUCT-MENTION POLICY for ${job.platform} (curated v${policyVersion || 'default'}): ${mentionRules[mentionPolicy]}` : ''}
Respond with STRICT JSON only: {"draft": "<the proposal text>", "product_mentioned": <true|false>}`;

    const user = `WORKSPACE
Name: ${ws.name} (${ws.type})
Tone/style: ${ws.tone_style || 'professional, direct, warm'}
Ideal client: ${ws.ideal_client_profile || '(not set)'}
Past work / portfolio: ${ws.portfolio || '(none provided)'}
${ws.type === 'saas' ? `Product: ${ws.product_name || ''} — ${ws.product_description || ''} (${ws.product_url || 'no url'})\nTarget customer: ${ws.target_customer || ''}` : ''}

WORKSPACE MEMORY
${memoryBlock}

FIT ANALYSIS
Score: ${proposal.fit_score ?? 'not scored'} — ${proposal.fit_reasoning || ''}

JOB (${job.platform})
Title: ${job.title}
Budget: ${job.budget || 'not stated'}
Description:
${(job.description || '').slice(0, 6000)}`;

    const raw = await aiChat(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      token,
      { maxTokens: 1100, temperature: 0.6, scope: { workspace_id: proposal.workspace_id, function_slug: 'draft-proposal' } },
    );
    const parsed = parseJsonLoose(raw);
    const draft = String(parsed.draft || '').trim();
    if (!draft) throw new Error('Drafting model returned an empty draft');
    let productMentioned = Boolean(parsed.product_mentioned);
    if (mentionPolicy === 'no_mention') productMentioned = false;

    const [updated] = await dbPatch('proposals', `id=eq.${proposal_id}`, {
      draft_content: draft,
      product_mentioned: productMentioned,
      mention_policy_applied: ws.type === 'saas' ? mentionPolicy : null,
      status: 'drafted',
    }, token);

    await logStatusChange(proposal_id, proposal.status, 'drafted', userId, 'AI draft generated', token);

    // Module C signal loop: every product-mentioning bid becomes a touchpoint.
    if (productMentioned) {
      await dbInsert('growth_touchpoints', [{
        proposal_id,
        workspace_id: proposal.workspace_id,
        product_mentioned: true,
        mention_policy: mentionPolicy,
      }], token);
    }

    await logPersona({
      workspace_id: proposal.workspace_id,
      persona: 'The Drafter',
      action: 'draft_proposal',
      params: { proposal_id, mention_policy: mentionPolicy, product_mentioned: productMentioned },
      result: draft.slice(0, 300),
      created_by: userId,
    }, token);

    return json({ proposal: updated, draft, product_mentioned: productMentioned, mention_policy: mentionPolicy });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'drafting failed' }, 500);
  }
}
