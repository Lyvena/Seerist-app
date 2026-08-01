// @include _shared
// ============================================================================
// ploybooks-execute — Module C. A Ploybook is a named, reusable growth play:
// an ordered list of steps the Grower runs end to end, recording what each step
// produced so the founder can see the reasoning, not just the conclusion.
//
// Steps are data, not code. Four kinds are supported:
//   query        pull real rows from this workspace (evidence, never invented)
//   llm          reason over the evidence gathered so far
//   stage_draft  park the output in deploy_sync_drafts as a DRAFT for review
//   function     call another Seerist edge function
//
// Nothing a Ploybook produces is ever published or sent. Everything lands as a
// draft or a recommendation for a human to act on — the same rule the rest of
// Seerist follows.
//
// Requests (POST):
//   { op: 'get_templates' }
//   { op: 'list_ploybooks', workspace_id }
//   { op: 'create_ploybook', workspace_id, name, description, steps }
//   { op: 'create_from_template', workspace_id, template_id }
//   { op: 'run_ploybook', ploybook_id, workspace_id }
//   { op: 'get_ploybook_runs', ploybook_id }
// ============================================================================

const MAX_STEPS = 10;

/**
 * Reference Ploybooks shipped with the engine. They are constants, not seeded
 * rows: a workspace copies the one it wants (create_from_template) and owns its
 * copy from then on.
 */
const PLOYBOOK_TEMPLATES = [
  {
    id: 'seo-aeo-boost',
    name: 'SEO/AEO Boost',
    description: 'Audit what your site already says, find the gaps between that and what buyers search for, draft optimized page content, and stage it for review.',
    steps: [
      {
        key: 'audit_pages',
        title: 'Audit current pages',
        kind: 'query',
        source: 'site_ingestion_jobs',
        note: 'Reads the positioning and summaries already ingested from your site.',
      },
      {
        key: 'keyword_gaps',
        title: 'Identify keyword gaps',
        kind: 'llm',
        prompt: 'From the ingested site content and the workspace product profile, list the 6-10 highest-value keyword and question ("answer engine") gaps: terms this buyer clearly searches for that the current pages do not answer. For each, say the gap and why it matters. Ground every claim in the evidence provided.',
      },
      {
        key: 'draft_content',
        title: 'Draft optimized page content',
        kind: 'llm',
        prompt: 'Write ready-to-edit page copy closing the top gaps you just identified: a title, meta description, H1, and 200-350 words of body copy per page, plus one direct question-and-answer block per page for answer engines. Match the existing positioning; do not invent product capabilities.',
      },
      {
        key: 'stage_review',
        title: 'Stage for review',
        kind: 'stage_draft',
        site_from: 'draft_content',
        docs_from: 'keyword_gaps',
        summary: 'SEO/AEO Boost — keyword gap analysis and drafted page content',
      },
    ],
  },
  {
    id: 'competitor-migration-bids',
    name: 'Competitor Migration Bids',
    description: 'Find open jobs where the client is already on a competitor, score how well you fit, and draft proposals that lead with the migration angle.',
    steps: [
      {
        key: 'find_jobs',
        title: 'Identify jobs mentioning competitors',
        kind: 'query',
        source: 'job_postings',
        match: 'competitors',
        note: 'Set strategy_config.competitors on the Ploybook to control which names are matched.',
      },
      {
        key: 'score_fit',
        title: 'Score fit',
        kind: 'llm',
        prompt: 'For each matched job, score fit 0-100 for this workspace and justify the score in one sentence. Rank them best-first and say plainly which are not worth bidding on.',
      },
      {
        key: 'draft_migration',
        title: 'Draft migration-angle proposals',
        kind: 'llm',
        prompt: 'For the top 3 jobs only, draft a proposal that leads with the migration angle: name the pain of staying on their current tool, the concrete migration path, and what week one looks like. Respect the workspace tone. Do not include external links or make claims about the competitor you cannot support.',
      },
    ],
  },
  {
    id: 'post-win-attribution',
    name: 'Post-Win Attribution',
    description: 'Check which bids actually produced signups, turn that into a growth report, and refresh the recommendation list.',
    steps: [
      {
        key: 'check_attributions',
        title: 'Check signup attributions',
        kind: 'query',
        source: 'attribution',
        note: 'Reads growth_touchpoints and product_signups for this workspace.',
      },
      {
        key: 'growth_report',
        title: 'Generate growth report',
        kind: 'llm',
        prompt: 'Write a short growth report from the attribution evidence: what converted, what did not, and the single most important thing to change next. Use only the numbers provided.',
      },
      {
        key: 'update_recs',
        title: 'Update recommendations',
        kind: 'function',
        fn: 'growth-feedback',
        body: { op: 'analyze' },
      },
    ],
  },
] as const;

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

  const op = String(body.op || body.action || 'run_ploybook');

  try {
    switch (op) {
      case 'get_templates':
        return json({ templates: PLOYBOOK_TEMPLATES });
      case 'list_ploybooks':
        return await listPloybooks(body, token);
      case 'create_ploybook':
        return await createPloybook(body, token, userId);
      case 'create_from_template':
        return await createFromTemplate(body, token, userId);
      case 'run_ploybook':
        return await runPloybook(body, token, userId);
      case 'get_ploybook_runs':
        return await getPloybookRuns(body, token);
      default:
        return json({ error: `Unknown op "${op}"` }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'ploybook operation failed' }, 500);
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

async function listPloybooks(body: any, token: string): Promise<Response> {
  const { workspace_id } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);
  const ploybooks = await dbSelect(
    'ploybooks',
    `workspace_id=eq.${workspace_id}&order=created_at.desc&limit=100`,
    token,
  );
  return json({ ploybooks, templates: PLOYBOOK_TEMPLATES });
}

async function createPloybook(body: any, token: string, userId: string | null): Promise<Response> {
  const { workspace_id, name, description } = body;
  if (!workspace_id || !name) return json({ error: 'workspace_id and name are required' }, 400);

  const steps = normalizeSteps(body.steps);
  if (!steps.length) {
    return json({ error: 'steps must be a non-empty array of { key, title, kind, ... } objects' }, 400);
  }

  const [ploybook] = await dbInsert('ploybooks', [{
    workspace_id,
    name: String(name).slice(0, 200),
    description: description ? String(description).slice(0, 1000) : null,
    steps,
    strategy_config: body.strategy_config && typeof body.strategy_config === 'object'
      ? body.strategy_config
      : { instruction: description || name },
    active: true,
  }], token);

  await logPersona({
    workspace_id,
    persona: 'The Grower',
    action: 'create_ploybook',
    params: { ploybook_id: ploybook.id, steps: steps.length },
    result: `Saved Ploybook "${ploybook.name}" with ${steps.length} step(s).`,
    created_by: userId,
  }, token);

  return json({ ploybook }, 201);
}

async function createFromTemplate(body: any, token: string, userId: string | null): Promise<Response> {
  const { workspace_id, template_id } = body;
  if (!workspace_id || !template_id) {
    return json({ error: 'workspace_id and template_id are required' }, 400);
  }
  const template = PLOYBOOK_TEMPLATES.find((t) => t.id === template_id);
  if (!template) {
    return json({ error: `Unknown template "${template_id}"`, templates: PLOYBOOK_TEMPLATES.map((t) => t.id) }, 404);
  }
  return await createPloybook({
    workspace_id,
    name: template.name,
    description: template.description,
    steps: template.steps,
    strategy_config: { template_id: template.id, ...(body.strategy_config || {}) },
  }, token, userId);
}

async function getPloybookRuns(body: any, token: string): Promise<Response> {
  const { ploybook_id, workspace_id } = body;
  if (!ploybook_id && !workspace_id) {
    return json({ error: 'ploybook_id or workspace_id is required' }, 400);
  }
  const filter = ploybook_id ? `ploybook_id=eq.${ploybook_id}` : `workspace_id=eq.${workspace_id}`;
  const runs = await dbSelect(
    'ploybook_runs',
    `${filter}&order=started_at.desc&limit=50`,
    token,
  );
  return json({ runs, count: runs.length });
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function runPloybook(body: any, token: string, userId: string | null): Promise<Response> {
  const { ploybook_id } = body;
  if (!ploybook_id) return json({ error: 'ploybook_id is required' }, 400);

  const ploybook = (await dbSelect('ploybooks', `id=eq.${ploybook_id}&limit=1`, token))[0];
  if (!ploybook) return json({ error: 'Ploybook not found' }, 404);

  const workspaceId = body.workspace_id || ploybook.workspace_id;
  if (workspaceId !== ploybook.workspace_id) {
    return json({ error: 'This Ploybook belongs to a different workspace' }, 403);
  }

  const steps = normalizeSteps(ploybook.steps);
  if (!steps.length) {
    return json({
      error: 'This Ploybook has no steps. Add steps (or start from a template) before running it.',
    }, 422);
  }

  const ws = (await dbSelect('workspaces', `id=eq.${workspaceId}&limit=1`, token))[0];
  if (!ws) return json({ error: 'Workspace not found' }, 404);

  const [run] = await dbInsert('ploybook_runs', [{
    ploybook_id,
    workspace_id: workspaceId,
    status: 'running',
    current_step: 0,
    results: [],
    created_by: userId,
  }], token);

  const outputs: Record<string, string> = {};
  const results: any[] = [];
  let failure: string | null = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await dbPatch('ploybook_runs', `id=eq.${run.id}`, { current_step: i }, token);
    const startedAt = new Date().toISOString();
    try {
      const { output, data } = await executeStep(step, {
        ws,
        ploybook,
        workspaceId,
        outputs,
        token,
      });
      outputs[step.key] = output;
      results.push({
        step: i,
        key: step.key,
        title: step.title,
        kind: step.kind,
        status: 'completed',
        output: output.slice(0, 8000),
        data: data ?? null,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      });
    } catch (e) {
      failure = e instanceof Error ? e.message : String(e);
      results.push({
        step: i,
        key: step.key,
        title: step.title,
        kind: step.kind,
        status: 'failed',
        output: failure,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      });
      break;
    }
    await dbPatch('ploybook_runs', `id=eq.${run.id}`, { results }, token);
  }

  const [finished] = await dbPatch('ploybook_runs', `id=eq.${run.id}`, {
    status: failure ? 'failed' : 'completed',
    current_step: Math.min(results.length, steps.length),
    results,
    error: failure,
    completed_at: new Date().toISOString(),
  }, token);

  await logPersona({
    workspace_id: workspaceId,
    persona: 'The Grower',
    action: 'run_ploybook',
    params: {
      ploybook_id,
      run_id: run.id,
      steps: steps.length,
      completed: results.filter((r) => r.status === 'completed').length,
    },
    result: failure
      ? `Ploybook "${ploybook.name}" failed at step ${results.length} of ${steps.length}: ${failure}`.slice(0, 2000)
      : `Ploybook "${ploybook.name}" completed all ${steps.length} step(s).`,
    created_by: userId,
  }, token);

  return json({ run: finished, results, failed: Boolean(failure) }, failure ? 200 : 201);
}

interface StepContext {
  ws: any;
  ploybook: any;
  workspaceId: string;
  outputs: Record<string, string>;
  token: string;
}

async function executeStep(step: any, ctx: StepContext): Promise<{ output: string; data?: unknown }> {
  switch (step.kind) {
    case 'query':
      return await runQueryStep(step, ctx);
    case 'stage_draft':
      return await runStageDraftStep(step, ctx);
    case 'function':
      return await runFunctionStep(step, ctx);
    case 'llm':
    default:
      return await runLlmStep(step, ctx);
  }
}

/** Evidence gathering. Every downstream step reasons only over what this finds. */
async function runQueryStep(step: any, ctx: StepContext): Promise<{ output: string; data?: unknown }> {
  const { workspaceId, token } = ctx;

  if (step.source === 'site_ingestion_jobs') {
    const jobs = await dbSelect(
      'site_ingestion_jobs',
      `workspace_id=eq.${workspaceId}&order=created_at.desc&limit=20`,
      token,
    );
    const complete = jobs.filter((j: any) => j.status === 'complete');
    const output = complete.length
      ? complete.map((j: any) => `${j.url}\n  Positioning: ${j.positioning || '—'}\n  Summary: ${(j.summary || '').slice(0, 800)}`).join('\n\n')
      : 'No completed site ingestion yet. Ingest your site on the Growth page first — this Ploybook can only audit pages Seerist has actually read.';
    return { output, data: { ingested: complete.length, total: jobs.length } };
  }

  if (step.source === 'job_postings') {
    const terms = competitorTerms(step, ctx);
    const jobs = await dbSelect(
      'job_postings',
      `workspace_id=eq.${workspaceId}&order=captured_at.desc&limit=200`,
      token,
    );
    const matched = terms.length
      ? jobs.filter((j: any) => {
        const haystack = `${j.title || ''} ${j.description || ''}`.toLowerCase();
        return terms.some((t) => haystack.includes(t));
      })
      : [];
    const output = !terms.length
      ? 'No competitor names configured. Set strategy_config.competitors (an array of names) on this Ploybook, then run it again.'
      : matched.length
        ? matched.slice(0, 15).map((j: any) => `[${j.platform}] ${j.title}\n  ${(j.description || '').slice(0, 600)}\n  ${j.url || ''}`).join('\n\n')
        : `No captured jobs mention ${terms.join(', ')}. Capture more jobs with the Chrome extension, or widen the competitor list.`;
    return { output, data: { terms, matched: matched.length, scanned: jobs.length } };
  }

  if (step.source === 'attribution') {
    const [touchpoints, signups, recs] = await Promise.all([
      dbSelect('growth_touchpoints', `workspace_id=eq.${workspaceId}&order=created_at.desc&limit=500`, token),
      dbSelect('product_signups', `workspace_id=eq.${workspaceId}&order=created_at.desc&limit=500`, token),
      dbSelect('growth_recommendations', `workspace_id=eq.${workspaceId}&order=priority.asc&limit=20`, token),
    ]);
    const attributed = touchpoints.filter((t: any) => t.attributed_signup_id);
    const data = {
      touchpoints: touchpoints.length,
      attributed_signups: attributed.length,
      total_signups: signups.length,
      organic_signups: signups.filter((s: any) => s.source !== 'bid_touchpoint').length,
      current_recommendations: recs.length,
    };
    const output = [
      `${data.touchpoints} tracked bid touchpoints.`,
      `${data.attributed_signups} of them produced an attributed signup.`,
      `${data.total_signups} product signups total (${data.organic_signups} organic).`,
      `${data.current_recommendations} recommendation(s) currently on file.`,
      attributed.length
        ? `Attributed policies: ${[...new Set(attributed.map((t: any) => t.mention_policy || 'unknown'))].join(', ')}.`
        : 'No signup has been attributed to a bid yet.',
    ].join('\n');
    return { output, data };
  }

  if (step.source === 'proposals') {
    const proposals = await dbSelect(
      'proposals',
      `workspace_id=eq.${workspaceId}&order=created_at.desc&limit=200`,
      token,
    );
    const output = `${proposals.length} proposals: ${proposals.filter((p: any) => p.outcome === 'won').length} won, ${proposals.filter((p: any) => p.status === 'submitted').length} submitted, ${proposals.filter((p: any) => p.product_mentioned).length} mentioned the product.`;
    return { output, data: { total: proposals.length } };
  }

  return {
    output: `Unknown query source "${step.source}". Supported: site_ingestion_jobs, job_postings, attribution, proposals.`,
  };
}

async function runLlmStep(step: any, ctx: StepContext): Promise<{ output: string }> {
  const evidence = Object.entries(ctx.outputs)
    .map(([key, value]) => `--- ${key} ---\n${String(value).slice(0, 4000)}`)
    .join('\n\n') || '(no prior steps)';

  const output = await aiChat([
    {
      role: 'system',
      content: `You are The Grower, executing one step of the "${ctx.ploybook.name}" Ploybook for a ${ctx.ws.type} workspace. Work ONLY from the evidence gathered by the previous steps — if the evidence is thin, say so plainly instead of filling the gap with assumptions. Output is read by a human and never published automatically.`,
    },
    {
      role: 'user',
      content: `WORKSPACE
Name: ${ctx.ws.name}
Product: ${ctx.ws.product_name || '(none)'} — ${ctx.ws.product_description || 'no description on file'}
Target customer: ${ctx.ws.target_customer || 'unspecified'}
Tone: ${ctx.ws.tone_style || 'neutral professional'}
Ploybook strategy: ${JSON.stringify(ctx.ploybook.strategy_config || {}).slice(0, 800)}

EVIDENCE FROM PREVIOUS STEPS
${evidence}

STEP: ${step.title}
${step.prompt || 'Complete this step.'}`,
    },
  ], ctx.token, { maxTokens: step.max_tokens || 1800, temperature: 0.4, scope: { workspace_id: ctx.workspaceId, function_slug: 'ploybooks-execute' } });

  return { output };
}

/** Ploybook output never ships — it parks in deploy_sync_drafts for review. */
async function runStageDraftStep(step: any, ctx: StepContext): Promise<{ output: string; data?: unknown }> {
  const [draft] = await dbInsert('deploy_sync_drafts', [{
    workspace_id: ctx.workspaceId,
    trigger_source: `ploybook:${ctx.ploybook.name}`,
    deploy_ref: null,
    change_summary: String(step.summary || `${ctx.ploybook.name} — staged for review`).slice(0, 1000),
    docs_draft: step.docs_from ? (ctx.outputs[step.docs_from] || null) : null,
    site_draft: step.site_from ? (ctx.outputs[step.site_from] || null) : null,
    status: 'draft',
  }], ctx.token);

  return {
    output: `Staged as a draft for review on the Growth page (draft ${String(draft.id).slice(0, 8)}). Nothing was published.`,
    data: { draft_id: draft.id },
  };
}

/**
 * A step that runs another piece of Seerist.
 *
 * It cannot do that over HTTP: a function on this platform cannot call another
 * (Deno Deploy answers 508 Loop Detected), which is why this step used to fail
 * with an unhelpful error. Only work whose implementation lives in _shared can
 * run in-process, so the supported set is explicit and anything else is
 * refused with an explanation instead of a mystery.
 */
async function runFunctionStep(step: any, ctx: StepContext): Promise<{ output: string; data?: unknown }> {
  if (!step.fn) throw new Error('function step is missing "fn"');
  const slug = String(step.fn);

  if (slug === 'score-job') {
    const proposalId = String((step.body || {}).proposal_id || '');
    if (!proposalId) throw new Error('score-job step needs a proposal_id');
    const res = await scoreProposal(proposalId, ctx.token, null);
    if ('error' in res) throw new Error(res.error);
    return { output: `Scored ${res.score}/100 — ${res.reasoning.slice(0, 300)}`, data: res };
  }

  if (slug === 'send_alert') {
    const { channel, message, to } = step.body || {};
    if (!channel || !message) throw new Error('send_alert step needs a channel and a message');
    const sent = await sendAlert(String(channel), String(message), to ? String(to) : null);
    if (!sent.sent) throw new Error(`Alert not sent: ${sent.detail}`);
    return { output: `Alert sent on ${channel}.`, data: sent };
  }

  throw new Error(
    `A Ploybook cannot run "${slug}": this platform does not allow one function to call another, ` +
    'so only steps implemented in the shared layer are available (score-job, send_alert). ' +
    'Use a query, llm or stage_draft step instead.',
  );
}

function summarizeFunctionResult(slug: string, data: any): string {
  if (slug === 'growth-feedback' && Array.isArray(data?.recommendations)) {
    return data.recommendations.length
      ? `Refreshed ${data.recommendations.length} recommendation(s):\n${data.recommendations.map((r: any) => `- [P${r.priority}] ${r.recommendation}`).join('\n')}`
      : 'Analysis ran but produced no recommendations yet.';
  }
  return `${slug} completed: ${JSON.stringify(data).slice(0, 1500)}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeSteps(input: unknown): any[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((s) => s && typeof s === 'object')
    .slice(0, MAX_STEPS)
    .map((s: any, i: number) => ({
      ...s,
      key: String(s.key || `step_${i + 1}`).slice(0, 60),
      title: String(s.title || s.key || `Step ${i + 1}`).slice(0, 200),
      kind: ['query', 'llm', 'stage_draft', 'function'].includes(s.kind) ? s.kind : 'llm',
    }));
}

function competitorTerms(step: any, ctx: StepContext): string[] {
  const raw = step.terms
    ?? (ctx.ploybook.strategy_config || {}).competitors
    ?? (ctx.ploybook.strategy_config || {}).terms;
  if (!Array.isArray(raw)) return [];
  return raw.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20);
}
