// @include _shared
// ============================================================================
// execute-delivery-task — Module B, The Builder.
//
// Executes delivery tasks as a DAG rather than a flat list. Dependencies live
// in task_dependencies; the run's graph is topologically ordered, tasks whose
// dependencies are satisfied run immediately, and everything downstream stays
// blocked until its upstream work is signed off. Per-task status is tracked
// independently and the delivery_run status is rolled up from all of them.
//
// Before deciding anything the Builder consults the Hermes memory layer
// (hermes_skills + hermes_memories) so the run starts from what this workspace
// has already learned.
//
// The mandatory human-QA checkpoint is unchanged: executed output lands at
// qa_pending and nothing is client-ready without explicit approval (qa-task).
//
// Requests (POST):
//   { task_id }                                    execute one task
//   { delivery_run_id }                            orchestrate the whole graph
//   { delivery_run_id, action: 'graph' }           inspect order/blocking only
//   { delivery_run_id, action: 'plan_dependencies' }  infer the DAG
//   { delivery_run_id, action: 'set_dependencies', dependencies: [...] }
// ============================================================================

/** delivery_tasks statuses that count as "the work is finished and signed off". */
const COMPLETED = ['qa_approved', 'done'];
/** ...and as "the work ran, QA pending". Used by dependency_mode: 'executed'. */
const EXECUTED = ['qa_pending', 'qa_approved', 'done'];
/** ...and as "this task can be (re)executed now". */
const RUNNABLE = ['todo', 'qa_rejected', 'failed'];

/** Tasks executed per orchestration call, so one request can't run forever. */
const MAX_TASKS_PER_RUN = 6;

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

  const { task_id, delivery_run_id } = body;
  if (!task_id && !delivery_run_id) {
    return json({ error: 'task_id or delivery_run_id is required' }, 400);
  }

  try {
    // --- Whole-graph modes ---------------------------------------------------
    if (!task_id) {
      const action = String(body.action || 'run');
      switch (action) {
        case 'graph':
          return await describeGraph(delivery_run_id, body, token);
        case 'plan_dependencies':
          return await planDependencies(delivery_run_id, token, userId);
        case 'set_dependencies':
          return await setDependencies(delivery_run_id, body.dependencies, token);
        case 'run':
          return await orchestrateRun(delivery_run_id, body, token, userId);
        default:
          return json({ error: `Unknown action "${action}"` }, 400);
      }
    }

    // --- Single-task mode (unchanged entry point for the Delivery UI) --------
    const task = (await dbSelect('delivery_tasks', `id=eq.${task_id}&limit=1`, token))[0];
    if (!task) return json({ error: 'Task not found' }, 404);
    if (!RUNNABLE.includes(task.status)) {
      return json({ error: `Task is ${task.status} — only todo/qa_rejected/failed tasks can be executed` }, 422);
    }

    const run = (await dbSelect('delivery_runs', `id=eq.${task.delivery_run_id}&limit=1`, token))[0];
    if (!run) return json({ error: 'Delivery run not found' }, 404);

    const graph = await loadGraph(run.id, token);
    const blockers = blockersFor(task.id, graph, dependencyMode(body));
    if (blockers.length && !body.force) {
      return json({
        error: `Blocked by ${blockers.length} unfinished dependenc${blockers.length === 1 ? 'y' : 'ies'}. Finish them first, or pass force: true to override.`,
        blocked: true,
        blocked_by: blockers.map(summarizeTask),
      }, 409);
    }

    const hermes = await loadHermesContext(run.workspace_id, token);
    const context = await loadRunContext(run, token);
    const executed = await executeTask(task, run, context, hermes, graph, token, userId);

    const refreshed = await dbSelect(
      'delivery_tasks',
      `delivery_run_id=eq.${run.id}&order=position.asc&limit=200`,
      token,
    );
    const rollup = await rollUpRunStatus(run, refreshed, token);

    return json({
      task: executed.task,
      lifecycle: lifecycleOf(executed.task.status),
      run_status: rollup.status,
      progress: rollup.progress,
      hermes_skills_consulted: hermes.skillCount,
    });
  } catch (e) {
    console.error(e);
    if (task_id) {
      try {
        await dbPatch('delivery_tasks', `id=eq.${task_id}`, { status: 'failed' }, token);
      } catch { /* best effort */ }
    }
    return json({ error: e instanceof Error ? e.message : 'task execution failed' }, 500);
  }
}

// ---------------------------------------------------------------------------
// Graph loading & topological ordering
// ---------------------------------------------------------------------------

interface Graph {
  tasks: any[];
  byId: Record<string, any>;
  dependsOn: Record<string, string[]>;
  dependents: Record<string, string[]>;
  edges: Array<{ task_id: string; depends_on_task_id: string }>;
  order: any[];
  cycle: string[];
}

async function loadGraph(runId: string, token: string): Promise<Graph> {
  const tasks = await dbSelect(
    'delivery_tasks',
    `delivery_run_id=eq.${runId}&order=position.asc&limit=200`,
    token,
  );
  const byId: Record<string, any> = {};
  for (const t of tasks) byId[t.id] = t;

  let edges: Array<{ task_id: string; depends_on_task_id: string }> = [];
  if (tasks.length) {
    const ids = tasks.map((t: any) => t.id).join(',');
    const rows = await dbSelect('task_dependencies', `task_id=in.(${ids})&limit=1000`, token);
    // Edges pointing outside this run's task set are ignored, not trusted.
    edges = rows
      .filter((d: any) => byId[d.task_id] && byId[d.depends_on_task_id])
      .map((d: any) => ({ task_id: d.task_id, depends_on_task_id: d.depends_on_task_id }));
  }

  const dependsOn: Record<string, string[]> = {};
  const dependents: Record<string, string[]> = {};
  for (const t of tasks) { dependsOn[t.id] = []; dependents[t.id] = []; }
  for (const e of edges) {
    dependsOn[e.task_id].push(e.depends_on_task_id);
    dependents[e.depends_on_task_id].push(e.task_id);
  }

  const { order, cycle } = topoSort(tasks, dependsOn);
  return { tasks, byId, dependsOn, dependents, edges, order, cycle };
}

/**
 * Kahn's algorithm, tie-broken by `position` so a run without any declared
 * dependencies keeps the exact sequential order the Builder decomposed it into.
 * Anything left over when the queue drains is part of a cycle.
 */
function topoSort(tasks: any[], dependsOn: Record<string, string[]>) {
  const indegree: Record<string, number> = {};
  for (const t of tasks) indegree[t.id] = (dependsOn[t.id] || []).length;

  const ready = tasks
    .filter((t) => indegree[t.id] === 0)
    .sort((a, b) => a.position - b.position);
  const order: any[] = [];
  const resolved = new Set<string>();

  while (ready.length) {
    const next = ready.shift()!;
    order.push(next);
    resolved.add(next.id);
    const unlocked: any[] = [];
    for (const t of tasks) {
      if (resolved.has(t.id) || ready.includes(t)) continue;
      const deps = dependsOn[t.id] || [];
      if (deps.length && deps.every((d) => resolved.has(d))) unlocked.push(t);
    }
    for (const t of unlocked) ready.push(t);
    ready.sort((a, b) => a.position - b.position);
  }

  const cycle = tasks.filter((t) => !resolved.has(t.id)).map((t) => t.id);
  return { order, cycle };
}

function dependencyMode(body: any): string[] {
  return body?.dependency_mode === 'executed' ? EXECUTED : COMPLETED;
}

/** The dependencies of `taskId` that are not yet finished. */
function blockersFor(taskId: string, graph: Graph, satisfied: string[]): any[] {
  return (graph.dependsOn[taskId] || [])
    .map((id) => graph.byId[id])
    .filter((t) => t && !satisfied.includes(t.status));
}

function lifecycleOf(status: string): 'pending' | 'running' | 'completed' | 'failed' {
  if (status === 'running') return 'running';
  if (status === 'failed') return 'failed';
  if (EXECUTED.includes(status)) return 'completed';
  return 'pending';
}

function summarizeTask(t: any) {
  return {
    id: t.id,
    position: t.position,
    description: String(t.description || '').slice(0, 160),
    status: t.status,
    lifecycle: lifecycleOf(t.status),
  };
}

// ---------------------------------------------------------------------------
// action: 'graph' — what would run, what is blocked, and why
// ---------------------------------------------------------------------------

async function describeGraph(runId: string, body: any, token: string): Promise<Response> {
  const run = (await dbSelect('delivery_runs', `id=eq.${runId}&limit=1`, token))[0];
  if (!run) return json({ error: 'Delivery run not found' }, 404);

  const graph = await loadGraph(runId, token);
  const satisfied = dependencyMode(body);

  const nodes = graph.order.map((t) => {
    const blockers = blockersFor(t.id, graph, satisfied);
    return {
      ...summarizeTask(t),
      depends_on: graph.dependsOn[t.id] || [],
      unlocks: graph.dependents[t.id] || [],
      blocked_by: blockers.map((b) => b.id),
      ready: blockers.length === 0 && RUNNABLE.includes(t.status),
    };
  });

  return json({
    run_id: runId,
    run_status: run.status,
    execution_order: nodes.map((n) => n.id),
    nodes,
    edges: graph.edges,
    cycle: graph.cycle,
    progress: progressOf(graph.tasks),
  });
}

// ---------------------------------------------------------------------------
// action: 'set_dependencies' / 'plan_dependencies'
// ---------------------------------------------------------------------------

async function setDependencies(runId: string, input: any, token: string): Promise<Response> {
  if (!Array.isArray(input)) return json({ error: 'dependencies must be an array' }, 400);

  const graph = await loadGraph(runId, token);
  if (!graph.tasks.length) return json({ error: 'This run has no tasks' }, 422);

  const proposed = input
    .map((d: any) => ({
      task_id: String(d?.task_id || ''),
      depends_on_task_id: String(d?.depends_on_task_id || ''),
    }))
    .filter((d) => graph.byId[d.task_id] && graph.byId[d.depends_on_task_id] && d.task_id !== d.depends_on_task_id);

  const accepted = acyclicSubset(graph.tasks, proposed);
  const rejected = proposed.length - accepted.length;

  // Replace the run's whole edge set — the caller states the graph it wants.
  if (graph.edges.length) {
    await dbDelete('task_dependencies', `task_id=in.(${graph.tasks.map((t) => t.id).join(',')})`, token);
  }
  if (accepted.length) await dbInsert('task_dependencies', accepted, token);

  const refreshed = await loadGraph(runId, token);
  return json({
    dependencies: refreshed.edges,
    execution_order: refreshed.order.map((t) => t.id),
    rejected_edges: rejected,
    message: rejected
      ? `${rejected} edge(s) rejected: unknown task, self-reference, or would have created a cycle.`
      : 'Dependency graph saved.',
  });
}

async function planDependencies(runId: string, token: string, userId: string | null): Promise<Response> {
  const run = (await dbSelect('delivery_runs', `id=eq.${runId}&limit=1`, token))[0];
  if (!run) return json({ error: 'Delivery run not found' }, 404);

  const graph = await loadGraph(runId, token);
  if (graph.tasks.length < 2) {
    return json({ error: 'A dependency graph needs at least two tasks' }, 422);
  }

  // Hermes first: the workspace's own skill library shapes how work is ordered.
  const hermes = await loadHermesContext(run.workspace_id, token);
  const context = await loadRunContext(run, token);

  const parsed = await aiJson([
    {
      role: 'system',
      content: `You are The Builder, planning the execution graph for a won contract. Decide which tasks genuinely BLOCK which other tasks — a dependency means the downstream task cannot start until the upstream one is finished and signed off. Keep the graph sparse: only real blockers, never "nice to do first". Never create a cycle.
Respond with STRICT JSON: {"dependencies": [{"task": <task number>, "depends_on": <task number>}, ...], "reasoning": "<2-3 sentences>"}`,
    },
    {
      role: 'user',
      content: `Contract: ${context.jobTitle}\nStack: ${run.target_stack}\n\nWORKSPACE SKILL LIBRARY (Hermes):\n${hermes.skillBlock}\n\nWORKSPACE MEMORY:\n${hermes.memoryBlock}\n\nTASKS:\n${graph.tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n')}`,
    },
  ], token, { maxTokens: 800, temperature: 0.2, scope: { workspace_id: run.workspace_id, function_slug: 'execute-delivery-task' } });

  const proposed: Array<{ task_id: string; depends_on_task_id: string }> = [];
  for (const d of Array.isArray(parsed.dependencies) ? parsed.dependencies : []) {
    const downstream = graph.tasks[Number(d?.task) - 1];
    const upstream = graph.tasks[Number(d?.depends_on) - 1];
    if (!downstream || !upstream || downstream.id === upstream.id) continue;
    proposed.push({ task_id: downstream.id, depends_on_task_id: upstream.id });
  }

  const accepted = acyclicSubset(graph.tasks, proposed);
  if (graph.edges.length) {
    await dbDelete('task_dependencies', `task_id=in.(${graph.tasks.map((t) => t.id).join(',')})`, token);
  }
  if (accepted.length) await dbInsert('task_dependencies', accepted, token);

  const refreshed = await loadGraph(runId, token);
  const reasoning = String(parsed.reasoning || '').slice(0, 1000);

  await appendTrace(run, {
    event: 'dependency_graph_planned',
    edges: accepted.length,
    hermes_skills_consulted: hermes.skillCount,
  }, token);

  await logPersona({
    workspace_id: run.workspace_id,
    persona: 'The Builder',
    action: 'plan_task_dependencies',
    params: {
      run_id: runId,
      edges: accepted.length,
      rejected: proposed.length - accepted.length,
      hermes_skills_consulted: hermes.skillCount,
    },
    result: reasoning || `Planned a ${accepted.length}-edge dependency graph over ${graph.tasks.length} tasks.`,
    created_by: userId,
  }, token);

  return json({
    dependencies: refreshed.edges,
    execution_order: refreshed.order.map((t) => t.id),
    reasoning,
    hermes_skills_consulted: hermes.skillCount,
  });
}

/** Greedily keep the edges that leave the graph acyclic, in the given order. */
function acyclicSubset(
  tasks: any[],
  proposed: Array<{ task_id: string; depends_on_task_id: string }>,
): Array<{ task_id: string; depends_on_task_id: string }> {
  const dependsOn: Record<string, string[]> = {};
  for (const t of tasks) dependsOn[t.id] = [];
  const kept: Array<{ task_id: string; depends_on_task_id: string }> = [];
  const seen = new Set<string>();

  for (const e of proposed) {
    const key = `${e.task_id}->${e.depends_on_task_id}`;
    if (seen.has(key)) continue;
    dependsOn[e.task_id].push(e.depends_on_task_id);
    if (topoSort(tasks, dependsOn).cycle.length) {
      dependsOn[e.task_id].pop();
      continue;
    }
    seen.add(key);
    kept.push(e);
  }
  return kept;
}

// ---------------------------------------------------------------------------
// action: 'run' — walk the graph and execute everything currently unblocked
// ---------------------------------------------------------------------------

async function orchestrateRun(runId: string, body: any, token: string, userId: string | null): Promise<Response> {
  const run = (await dbSelect('delivery_runs', `id=eq.${runId}&limit=1`, token))[0];
  if (!run) return json({ error: 'Delivery run not found' }, 404);
  if (['delivered', 'cancelled'].includes(run.status)) {
    return json({ error: `Run is ${run.status} — nothing left to orchestrate` }, 422);
  }

  const graph = await loadGraph(runId, token);
  if (!graph.tasks.length) return json({ error: 'This run has no tasks' }, 422);
  if (graph.cycle.length) {
    return json({
      error: 'The task graph contains a cycle and cannot be ordered. Fix the dependencies before running.',
      cycle: graph.cycle.map((id) => summarizeTask(graph.byId[id])),
    }, 409);
  }

  const satisfied = dependencyMode(body);
  const limit = Math.min(Math.max(Number(body.max_tasks) || MAX_TASKS_PER_RUN, 1), MAX_TASKS_PER_RUN);

  const hermes = await loadHermesContext(run.workspace_id, token);
  const context = await loadRunContext(run, token);

  const executed: any[] = [];
  const failed: any[] = [];
  // Statuses change as we go, so track them locally rather than re-reading.
  const statuses: Record<string, string> = {};
  for (const t of graph.tasks) statuses[t.id] = t.status;

  for (const task of graph.order) {
    if (executed.length + failed.length >= limit) break;
    if (!RUNNABLE.includes(statuses[task.id])) continue;
    const blocked = (graph.dependsOn[task.id] || []).some((d) => !satisfied.includes(statuses[d]));
    if (blocked) continue;

    try {
      const result = await executeTask(task, run, context, hermes, graph, token, userId);
      statuses[task.id] = result.task.status;
      executed.push(summarizeTask(result.task));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      try {
        await dbPatch('delivery_tasks', `id=eq.${task.id}`, { status: 'failed', qa_note: message.slice(0, 500) }, token);
      } catch { /* best effort */ }
      statuses[task.id] = 'failed';
      failed.push({ ...summarizeTask(task), status: 'failed', error: message });
      await logPersona({
        workspace_id: run.workspace_id,
        persona: 'The Builder',
        action: 'task_failed',
        params: { run_id: runId, task_id: task.id, position: task.position },
        result: message.slice(0, 1000),
        created_by: userId,
      }, token);
    }
  }

  const refreshed = await dbSelect(
    'delivery_tasks',
    `delivery_run_id=eq.${runId}&order=position.asc&limit=200`,
    token,
  );
  const rollup = await rollUpRunStatus(run, refreshed, token);

  const refreshedGraph = await loadGraph(runId, token);
  const blocked = refreshedGraph.tasks
    .filter((t) => RUNNABLE.includes(t.status))
    .map((t) => ({ ...summarizeTask(t), blocked_by: blockersFor(t.id, refreshedGraph, satisfied).map(summarizeTask) }))
    .filter((t) => t.blocked_by.length);

  await logPersona({
    workspace_id: run.workspace_id,
    persona: 'The Builder',
    action: 'orchestrate_delivery_run',
    params: {
      run_id: runId,
      executed: executed.length,
      failed: failed.length,
      blocked: blocked.length,
      edges: refreshedGraph.edges.length,
      hermes_skills_consulted: hermes.skillCount,
    },
    result: `Executed ${executed.length} task(s), ${failed.length} failed, ${blocked.length} still blocked. Run is now ${rollup.status}.`,
    created_by: userId,
  }, token);

  return json({
    run_id: runId,
    run_status: rollup.status,
    progress: rollup.progress,
    executed,
    failed,
    blocked,
    execution_order: refreshedGraph.order.map((t) => t.id),
    hermes_skills_consulted: hermes.skillCount,
  });
}

// ---------------------------------------------------------------------------
// Task execution
// ---------------------------------------------------------------------------

async function executeTask(
  task: any,
  run: any,
  context: { jobTitle: string; jobDescription: string },
  hermes: HermesContext,
  graph: Graph,
  token: string,
  userId: string | null,
): Promise<{ task: any }> {
  await dbPatch('delivery_tasks', `id=eq.${task.id}`, { status: 'running' }, token);
  await appendTrace(run, { event: 'task_started', task_id: task.id, position: task.position }, token);
  await logPersona({
    workspace_id: run.workspace_id,
    persona: 'The Builder',
    action: 'task_started',
    params: {
      run_id: run.id,
      task_id: task.id,
      position: task.position,
      depends_on: graph.dependsOn[task.id] || [],
    },
    result: `Started task ${task.position + 1}: ${String(task.description).slice(0, 200)}`,
    created_by: userId,
  }, token);

  // Upstream outputs are the Builder's most useful context — a downstream task
  // that ignores what its dependencies produced will contradict them.
  const upstream = (graph.dependsOn[task.id] || [])
    .map((id) => graph.byId[id])
    .filter(Boolean)
    .map((t: any) => `- Task ${t.position + 1} (${t.status}): ${t.description}\n  Output excerpt: ${(t.agent_output || '(not yet produced)').slice(0, 700)}`)
    .join('\n') || '(no upstream tasks)';

  const output = await aiChat([
    {
      role: 'system',
      content: `You are The Builder, Seerist's delivery agent executing one task of a won contract on the ${run.target_stack} stack. Produce the complete, client-ready work product for THIS task only (code, copy, schema, config, or documentation as appropriate). Be concrete and complete — this output goes to human QA next. Stay consistent with the upstream task outputs you are given. If the task needs code, write real ${run.target_stack === 'instantdb' ? 'InstantDB (typed schema, @instantdb/react)' : 'InsForge (Postgres + @insforge/sdk)'} code.`,
    },
    {
      role: 'user',
      content: `CONTRACT: ${context.jobTitle}\nQA feedback from previous attempt: ${task.qa_note || '(first attempt)'}\n${stackBlock(run)}\nWORKSPACE SKILL LIBRARY (Hermes):\n${hermes.skillBlock}\n\nWORKSPACE MEMORY:\n${hermes.memoryBlock}\n\nUPSTREAM DEPENDENCIES:\n${upstream}\n\nTASK ${task.position + 1}: ${task.description}\n\nContext (job description):\n${context.jobDescription}`,
    },
  ], token, { maxTokens: 3000, temperature: 0.4, scope: { workspace_id: run.workspace_id, function_slug: 'execute-delivery-task' } });

  const [updated] = await dbPatch('delivery_tasks', `id=eq.${task.id}`, {
    status: 'qa_pending',
    agent_output: output,
    qa_note: null,
  }, token);

  await appendTrace(run, {
    event: 'task_executed',
    task_id: task.id,
    position: task.position,
    output_chars: output.length,
  }, token);

  await logPersona({
    workspace_id: run.workspace_id,
    persona: 'The Builder',
    action: 'execute_delivery_task',
    params: {
      run_id: run.id,
      task_id: task.id,
      position: task.position,
      depends_on: graph.dependsOn[task.id] || [],
      unlocks: graph.dependents[task.id] || [],
      hermes_skills_consulted: hermes.skillCount,
    },
    result: `Task output ready for human QA (${output.length} chars)`,
    created_by: userId,
  }, token);

  return { task: updated };
}

/**
 * When the client's backend has actually been provisioned (delivery-stack),
 * tell The Builder the real host so generated code targets a live project
 * instead of a placeholder. The API key is deliberately NOT included — it is
 * fetched on demand at handoff and never sits in a prompt.
 */
function stackBlock(run: any): string {
  if (!run.stack_access_host) return '\n';
  return `\nTARGET BACKEND (already provisioned for this client):
  Base URL: ${run.stack_access_host}
  Read the anon/API key from an environment variable — never hardcode it.
  Write code against this real project: schema migrations, edge functions and
  client calls should all assume this host.\n`;
}

async function loadRunContext(run: any, token: string) {
  const proposal = run.proposal_id
    ? (await dbSelect('proposals', `id=eq.${run.proposal_id}&limit=1`, token))[0]
    : null;
  const job = proposal?.job_posting_id
    ? (await dbSelect('job_postings', `id=eq.${proposal.job_posting_id}&limit=1`, token))[0]
    : null;
  return {
    jobTitle: job?.title || '(untitled contract)',
    jobDescription: (job?.description || '').slice(0, 3000),
  };
}

// ---------------------------------------------------------------------------
// Run status roll-up
// ---------------------------------------------------------------------------

function progressOf(tasks: any[]) {
  const counts = { pending: 0, running: 0, completed: 0, failed: 0 };
  for (const t of tasks) counts[lifecycleOf(t.status)]++;
  return {
    ...counts,
    total: tasks.length,
    qa_approved: tasks.filter((t) => COMPLETED.includes(t.status)).length,
    awaiting_qa: tasks.filter((t) => t.status === 'qa_pending').length,
  };
}

/**
 * The run's status is derived from its tasks, never set independently.
 * `delivered` stays a human decision (complete-delivery-run), so a run whose
 * tasks are all QA-approved sits at `qa` waiting for the handoff.
 */
async function rollUpRunStatus(run: any, tasks: any[], token: string) {
  const progress = progressOf(tasks);
  if (['delivered', 'cancelled'].includes(run.status)) {
    return { status: run.status, progress };
  }

  let status: string;
  if (!tasks.length) status = 'planning';
  else if (progress.running > 0) status = 'running';
  else if (progress.awaiting_qa > 0) status = 'qa';
  else if (progress.qa_approved === tasks.length) status = 'qa';
  else if (progress.failed === tasks.length) status = 'failed';
  else if (progress.completed > 0 || progress.failed > 0) status = 'running';
  else status = 'planning';

  if (status !== run.status) {
    const trace = Array.isArray(run.openhands_trace) ? run.openhands_trace : [];
    trace.push({
      at: new Date().toISOString(),
      event: 'run_status_rolled_up',
      from: run.status,
      to: status,
      progress,
    });
    await dbPatch('delivery_runs', `id=eq.${run.id}`, { status, openhands_trace: trace }, token);
    run.status = status;
    run.openhands_trace = trace;
  }
  return { status, progress };
}

async function appendTrace(run: any, entry: Record<string, unknown>, token: string): Promise<void> {
  try {
    const trace = Array.isArray(run.openhands_trace) ? run.openhands_trace : [];
    trace.push({ at: new Date().toISOString(), ...entry });
    await dbPatch('delivery_runs', `id=eq.${run.id}`, { openhands_trace: trace }, token);
    run.openhands_trace = trace;
  } catch (e) {
    console.error('trace append failed:', e instanceof Error ? e.message : e);
  }
}

// ---------------------------------------------------------------------------
// Hermes memory consult
// ---------------------------------------------------------------------------

interface HermesContext {
  skillBlock: string;
  memoryBlock: string;
  skillCount: number;
}

/**
 * Reads the Hermes layer this workspace has accumulated: the structured skill
 * library and key/value memories written by hermes-memory, plus the older
 * free-text workspace_memories notes so nothing already learned is dropped.
 */
async function loadHermesContext(workspaceId: string, token: string): Promise<HermesContext> {
  const [skills, memories, legacy] = await Promise.all([
    safeSelect('hermes_skills', `workspace_id=eq.${workspaceId}&order=created_at.desc&limit=8`, token),
    safeSelect('hermes_memories', `workspace_id=eq.${workspaceId}&order=updated_at.desc&limit=15`, token),
    safeSelect('workspace_memories', `workspace_id=eq.${workspaceId}&order=updated_at.desc&limit=10`, token),
  ]);

  const skillBlock = skills.map((s: any) => {
    const d = s.skill_data || {};
    const steps = Array.isArray(d.steps) && d.steps.length ? `\n  Steps: ${d.steps.slice(0, 6).join(' → ')}` : '';
    const pitfalls = Array.isArray(d.pitfalls) && d.pitfalls.length ? `\n  Avoid: ${d.pitfalls.slice(0, 4).join('; ')}` : '';
    return `- ${s.skill_name}${d.applies_when ? ` (use when: ${d.applies_when})` : ''}\n  ${String(d.summary || '').slice(0, 400)}${steps}${pitfalls}`;
  }).join('\n') || '(no skills learned yet)';

  const memoryLines = [
    ...memories.map((m: any) => `- ${m.key}: ${JSON.stringify(m.value).slice(0, 300)}`),
    ...legacy.map((m: any) => `- [${m.kind}] ${String(m.content || '').slice(0, 300)}`),
  ];

  return {
    skillBlock,
    memoryBlock: memoryLines.join('\n') || '(none)',
    skillCount: skills.length,
  };
}

/** A missing optional table must never break a delivery run. */
async function safeSelect(table: string, query: string, token: string): Promise<any[]> {
  try {
    return await dbSelect(table, query, token);
  } catch (e) {
    console.error(`optional select ${table} failed:`, e instanceof Error ? e.message : e);
    return [];
  }
}
