// @include _shared
// ============================================================================
// hermes-memory — the persistent per-workspace memory layer.
//
// Two stores, both workspace-scoped and both RLS-protected:
//   hermes_memories  key → jsonb value. Client preferences, positioning,
//                    decision rules, tone guidance — anything a persona should
//                    remember across runs.
//   hermes_skills    reusable skills extracted from COMPLETED delivery runs:
//                    "how we did this well last time", so the next run starts
//                    from experience instead of from zero.
//
// Consulted by The Builder (execute-delivery-task, when decomposing and when
// executing tasks) and by The Drafter (proposal generation).
//
// Operations (POST { op, ... }):
//   store_memory          { workspace_id, key, value }
//   retrieve_memory       { workspace_id, key }
//   retrieve_all_memories { workspace_id }
//   extract_skill         { delivery_run_id }
//   get_skills            { workspace_id }
//
// The InsForge client (dbSelect / dbInsert / dbPatch / aiChat against the
// project's records + model-gateway APIs) is inlined from functions/_shared.ts
// at deploy time — the same client every other Seerist function uses.
// ============================================================================

const HERMES_OPS = new Set([
  'store_memory',
  'retrieve_memory',
  'retrieve_all_memories',
  'extract_skill',
  'get_skills',
]);

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
  if (!HERMES_OPS.has(op)) {
    return json({ error: `op must be one of: ${[...HERMES_OPS].join(', ')}` }, 400);
  }

  try {
    switch (op) {
      case 'store_memory':
        return await storeMemory(body, token);
      case 'retrieve_memory':
        return await retrieveMemory(body, token);
      case 'retrieve_all_memories':
        return await retrieveAllMemories(body, token);
      case 'extract_skill':
        return await extractSkill(body, token, userId);
      case 'get_skills':
        return await getSkills(body, token);
      default:
        return json({ error: 'Unsupported op' }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'hermes-memory failed' }, 500);
  }
}

// --- store_memory ------------------------------------------------------------
// Upsert on (workspace_id, key). PostgREST merge-duplicates needs the unique
// index name, so we read-then-write instead: one extra round trip, no coupling
// to the constraint's name.

async function storeMemory(body: any, token: string): Promise<Response> {
  const { workspace_id, key } = body;
  if (!workspace_id || !key) {
    return json({ error: 'workspace_id and key are required' }, 400);
  }
  if (body.value === undefined) return json({ error: 'value is required' }, 400);

  const memoryKey = String(key).slice(0, 200);
  const value = normalizeValue(body.value);

  const existing = await dbSelect(
    'hermes_memories',
    `workspace_id=eq.${workspace_id}&key=eq.${encodeURIComponent(memoryKey)}&limit=1`,
    token,
  );

  const [memory] = existing.length
    ? await dbPatch(
      'hermes_memories',
      `id=eq.${existing[0].id}`,
      { value, updated_at: new Date().toISOString() },
      token,
    )
    : await dbInsert('hermes_memories', [{ workspace_id, key: memoryKey, value }], token);

  return json({ memory, created: existing.length === 0 });
}

// --- retrieve_memory ---------------------------------------------------------

async function retrieveMemory(body: any, token: string): Promise<Response> {
  const { workspace_id, key } = body;
  if (!workspace_id || !key) {
    return json({ error: 'workspace_id and key are required' }, 400);
  }
  const rows = await dbSelect(
    'hermes_memories',
    `workspace_id=eq.${workspace_id}&key=eq.${encodeURIComponent(String(key))}&limit=1`,
    token,
  );
  if (!rows.length) return json({ memory: null, value: null, found: false });
  return json({ memory: rows[0], value: rows[0].value, found: true });
}

// --- retrieve_all_memories ---------------------------------------------------

async function retrieveAllMemories(body: any, token: string): Promise<Response> {
  const { workspace_id, limit } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);
  const cap = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const memories = await dbSelect(
    'hermes_memories',
    `workspace_id=eq.${workspace_id}&order=updated_at.desc&limit=${cap}`,
    token,
  );
  return json({
    memories,
    map: Object.fromEntries(memories.map((m: any) => [m.key, m.value])),
    count: memories.length,
  });
}

// --- extract_skill -----------------------------------------------------------
// Reads a completed delivery run's tasks + QA notes and distils ONE reusable
// skill the next run can apply. Only delivered runs qualify: an unfinished run
// has not proven anything worth remembering.

async function extractSkill(body: any, token: string, userId: string | null): Promise<Response> {
  const { delivery_run_id } = body;
  if (!delivery_run_id) return json({ error: 'delivery_run_id is required' }, 400);

  const run = (await dbSelect('delivery_runs', `id=eq.${delivery_run_id}&limit=1`, token))[0];
  if (!run) return json({ error: 'Delivery run not found' }, 404);

  const tasks = await dbSelect(
    'delivery_tasks',
    `delivery_run_id=eq.${delivery_run_id}&order=position.asc&limit=100`,
    token,
  );
  if (!tasks.length) return json({ error: 'This delivery run has no tasks to learn from' }, 422);

  const approved = tasks.filter((t: any) => ['qa_approved', 'done'].includes(t.status));
  if (!approved.length) {
    return json({
      error: 'No QA-approved tasks on this run yet — skills are only extracted from work a human has signed off.',
    }, 422);
  }

  const proposal = run.proposal_id
    ? (await dbSelect('proposals', `id=eq.${run.proposal_id}&limit=1`, token))[0]
    : null;
  const job = proposal?.job_posting_id
    ? (await dbSelect('job_postings', `id=eq.${proposal.job_posting_id}&limit=1`, token))[0]
    : null;

  const transcript = approved
    .map((t: any) => `TASK ${t.position + 1}: ${t.description}\nQA: ${t.qa_note || 'approved clean'}\nOUTPUT (excerpt): ${(t.agent_output || '').slice(0, 900)}`)
    .join('\n\n')
    .slice(0, 12000);

  let skillName = `${job?.title ? String(job.title).slice(0, 60) : 'Delivery run'} playbook`;
  let skillData: Record<string, unknown> = {};
  try {
    const parsed = await aiJson([
      {
        role: 'system',
        content: `You are Hermes, Seerist's memory layer. Distil ONE reusable delivery skill from a completed, human-QA-approved contract so future runs start from experience. Respond with STRICT JSON:
{"skill_name": "<short imperative name, max 60 chars>",
 "summary": "<2-3 sentences: what worked and why>",
 "applies_when": "<the situation this skill should be recalled in>",
 "steps": ["<concrete step>", "..."],
 "pitfalls": ["<what to avoid, drawn from QA feedback>"]}`,
      },
      {
        role: 'user',
        content: `Contract: ${job?.title || '(untitled)'}\nStack: ${run.target_stack}\n\n${transcript}`,
      },
    ], token, { maxTokens: 700, temperature: 0.3, scope: { workspace_id: run.workspace_id, function_slug: 'hermes-memory' } });
    if (parsed.skill_name) skillName = String(parsed.skill_name).slice(0, 120);
    skillData = {
      summary: String(parsed.summary || '').slice(0, 2000),
      applies_when: String(parsed.applies_when || '').slice(0, 600),
      steps: toStringArray(parsed.steps).slice(0, 12),
      pitfalls: toStringArray(parsed.pitfalls).slice(0, 8),
      stack: run.target_stack,
      contract: job?.title || null,
      task_count: approved.length,
    };
  } catch (e) {
    // A model hiccup must not lose the run's lesson — store the raw evidence.
    skillData = {
      summary: 'Automatic distillation was unavailable; raw QA-approved task list retained.',
      applies_when: job?.title ? `Contracts similar to "${job.title}"` : 'Similar delivery runs',
      steps: approved.map((t: any) => String(t.description).slice(0, 300)).slice(0, 12),
      pitfalls: approved.map((t: any) => t.qa_note).filter(Boolean).slice(0, 8),
      stack: run.target_stack,
      contract: job?.title || null,
      task_count: approved.length,
      extraction_error: e instanceof Error ? e.message : String(e),
    };
  }

  const [skill] = await dbInsert('hermes_skills', [{
    workspace_id: run.workspace_id,
    skill_name: skillName,
    skill_data: skillData,
    source_delivery_run_id: delivery_run_id,
  }], token);

  await logPersona({
    workspace_id: run.workspace_id,
    persona: 'The Builder',
    action: 'hermes_extract_skill',
    params: { delivery_run_id, skill_id: skill.id, tasks: approved.length },
    result: `Learned "${skillName}" from ${approved.length} QA-approved task(s).`,
    created_by: userId,
  }, token);

  return json({ skill }, 201);
}

// --- get_skills --------------------------------------------------------------

async function getSkills(body: any, token: string): Promise<Response> {
  const { workspace_id, limit } = body;
  if (!workspace_id) return json({ error: 'workspace_id is required' }, 400);
  const cap = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const skills = await dbSelect(
    'hermes_skills',
    `workspace_id=eq.${workspace_id}&order=created_at.desc&limit=${cap}`,
    token,
  );
  return json({ skills, count: skills.length });
}

// --- helpers -----------------------------------------------------------------

/** jsonb accepts any JSON, but a bare scalar is easier to read back wrapped. */
function normalizeValue(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value === 'object') return value;
  return { value };
}

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((x) => String(x).trim()).filter(Boolean);
}
