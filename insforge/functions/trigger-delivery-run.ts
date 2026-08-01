// @include _shared
// ============================================================================
// trigger-delivery-run — Module B. Contract won → task decomposition →
// (optionally) OpenHands sandboxed execution kickoff → human QA later.
//
// Default delivery stack is decided by the Hermes-style memory decision rule:
// InstantDB for client-heavy/real-time deliverables, InsForge for fuller
// server-side stacks — always overridable, never forced when the client
// specified their own stack.
//
// OpenHands: when OPENHANDS_API_KEY (+ optional OPENHANDS_BASE_URL, default
// OpenHands Cloud) is configured as a project secret, the run starts a real
// sandboxed OpenHands conversation and stores its id + trace. Without a key,
// the run is fully planned (tasks decomposed, stack chosen) and tasks execute
// through the model gateway inside Seerist instead.
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
  const { proposal_id, target_stack, packaging_channel } = body;
  if (!proposal_id) return json({ error: 'proposal_id is required' }, 400);

  try {
    const proposal = (await dbSelect('proposals', `id=eq.${proposal_id}&limit=1`, token))[0];
    if (!proposal) return json({ error: 'Proposal not found' }, 404);
    if (proposal.outcome !== 'won') {
      return json({ error: 'Delivery runs can only be triggered for WON proposals' }, 422);
    }
    const existing = await dbSelect('delivery_runs', `proposal_id=eq.${proposal_id}&limit=1`, token);
    if (existing.length) return json({ error: 'A delivery run already exists for this proposal', run: existing[0] }, 409);

    const job = (await dbSelect('job_postings', `id=eq.${proposal.job_posting_id}&limit=1`, token))[0];
    const ws = (await dbSelect('workspaces', `id=eq.${proposal.workspace_id}&limit=1`, token))[0];

    // --- Stack decision (Hermes memory decision rule + model gateway) -------
    let stack = DEFAULT_TARGET_STACK;
    let stackReasoning = '';
    const explicit = explicitStack(target_stack);
    if (explicit) {
      stack = explicit.stack;
      stackReasoning = explicit.reasoning;
    } else {
      const rules = await dbSelect(
        'workspace_memories',
        `workspace_id=eq.${proposal.workspace_id}&kind=eq.decision_rule&limit=5`,
        token,
      );
      const ruleText = rules.map((r: any) => r.content).join('\n') || DEFAULT_STACK_RULE;
      const raw = await aiChat([
        { role: 'system', content: `You are The Builder, Seerist's delivery engineer. Choose the default backend stack for a won contract using this decision rule:\n${ruleText}\nRespond with STRICT JSON: {"stack": "instantdb"|"insforge", "reasoning": "<2-3 sentences>"}` },
        { role: 'user', content: `Job title: ${job?.title}\nJob description:\n${(job?.description || '').slice(0, 4000)}` },
      ], token, { maxTokens: 300, temperature: 0.2, scope: { workspace_id: proposal.workspace_id, function_slug: 'trigger-delivery-run' } });
      const parsed = parseJsonLoose(raw);
      stack = normalizeStackChoice(parsed.stack);
      stackReasoning = String(parsed.reasoning || '');
    }

    // --- Task decomposition --------------------------------------------------
    const rawTasks = await aiChat([
      { role: 'system', content: 'You are The Builder. Decompose a won freelance contract into 4-8 concrete, sequential delivery tasks. Each task must be independently executable and QA-checkable. Respond with STRICT JSON: {"tasks": ["<task 1>", "<task 2>", ...]}' },
      { role: 'user', content: `Contract: ${job?.title}\nWinning proposal:\n${(proposal.draft_content || '').slice(0, 2500)}\nJob description:\n${(job?.description || '').slice(0, 4000)}\nTarget stack: ${stack}` },
    ], token, { maxTokens: 800, temperature: 0.3, scope: { workspace_id: proposal.workspace_id, function_slug: 'trigger-delivery-run' } });
    const taskList: string[] = (parseJsonLoose(rawTasks).tasks || [])
      .map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 12);
    if (!taskList.length) throw new Error('Task decomposition returned no tasks');

    // --- OpenHands kickoff (real sandboxed execution when configured) -------
    const trace: any[] = [
      { at: new Date().toISOString(), event: 'run_created', stack, reasoning: stackReasoning },
    ];
    let openhandsId: string | null = null;
    let status = 'planning';
    const ohKey = Deno.env.get('OPENHANDS_API_KEY');
    const ohBase = Deno.env.get('OPENHANDS_BASE_URL') ?? 'https://app.all-hands.dev';
    if (ohKey) {
      try {
        const res = await fetch(`${ohBase}/api/conversations`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${ohKey}`, 'X-Session-API-Key': ohKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initial_user_msg: `Deliver this won freelance contract on the ${stack} stack.\nContract: ${job?.title}\nTasks:\n${taskList.map((t, i) => `${i + 1}. ${t}`).join('\n')}\nJob description:\n${(job?.description || '').slice(0, 3000)}`,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.conversation_id || data.id)) {
          openhandsId = data.conversation_id || data.id;
          status = 'running';
          trace.push({ at: new Date().toISOString(), event: 'openhands_started', conversation_id: openhandsId });
        } else {
          trace.push({ at: new Date().toISOString(), event: 'openhands_error', status: res.status, detail: JSON.stringify(data).slice(0, 300) });
        }
      } catch (e) {
        trace.push({ at: new Date().toISOString(), event: 'openhands_unreachable', detail: e instanceof Error ? e.message : String(e) });
      }
    } else {
      trace.push({ at: new Date().toISOString(), event: 'openhands_not_configured', detail: 'Set the OPENHANDS_API_KEY project secret to run tasks in an OpenHands sandbox. Tasks will execute via the InsForge model gateway inside Seerist until then.' });
    }

    const [run] = await dbInsert('delivery_runs', [{
      proposal_id,
      workspace_id: proposal.workspace_id,
      status,
      target_stack: stack,
      stack_reasoning: stackReasoning,
      openhands_conversation_id: openhandsId,
      openhands_trace: trace,
      packaging_channel: ['drive', 'github', 'gitlab', 'download'].includes(packaging_channel) ? packaging_channel : null,
      created_by: userId,
    }], token);

    await dbInsert('delivery_tasks', taskList.map((description, i) => ({
      delivery_run_id: run.id,
      position: i,
      description,
      status: 'todo',
    })), token);

    // Persist the stack decision back into workspace memory (skill learning).
    try {
      await dbInsert('workspace_memories', [{
        workspace_id: proposal.workspace_id,
        key: `stack_decision_${run.id.slice(0, 8)}`,
        kind: 'decision_rule',
        content: `For "${job?.title}" chose ${stack}: ${stackReasoning}`,
        source: 'trigger-delivery-run',
      }], token);
    } catch { /* non-fatal (unique key collision) */ }

    await logPersona({
      workspace_id: proposal.workspace_id,
      persona: 'The Builder',
      action: 'trigger_delivery_run',
      params: { proposal_id, run_id: run.id, stack, openhands: Boolean(openhandsId), tasks: taskList.length },
      result: stackReasoning.slice(0, 400),
      created_by: userId,
    }, token);

    return json({ run, tasks: taskList }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'delivery trigger failed' }, 500);
  }
}

/** The stacks a delivery run may target. Mirrors the delivery_runs check constraint. */
const TARGET_STACKS = ['instantdb', 'insforge', 'client_specified'];

/** Falling back to the fuller server-side stack is the safe default. */
const DEFAULT_TARGET_STACK = 'insforge';

/** Used when the workspace has no decision_rule memories of its own yet. */
const DEFAULT_STACK_RULE =
  'Default rule: InstantDB for client-heavy, real-time deliverables (dashboards, collaborative tools, chat-like features); InsForge for deliverables needing a fuller server-side stack (auth, storage, edge functions).';

/**
 * An explicitly requested stack short-circuits the model entirely. Notably
 * `client_specified` must survive untouched: when a contract names the client's
 * own stack, nothing here may override it. Returns null when there is no valid
 * request to honour, which hands the decision to the rule below.
 */
function explicitStack(requested: unknown): { stack: string; reasoning: string } | null {
  if (typeof requested !== 'string' || !TARGET_STACKS.includes(requested)) return null;
  return {
    stack: requested,
    reasoning: requested === 'client_specified'
      ? 'Client explicitly specified their own stack — Seerist never forces a default onto a specified stack.'
      : 'Stack manually selected by the workspace.',
  };
}

/** Only an explicit instantdb vote picks InstantDB; anything else defaults. */
function normalizeStackChoice(choice: unknown): string {
  return choice === 'instantdb' ? 'instantdb' : DEFAULT_TARGET_STACK;
}
