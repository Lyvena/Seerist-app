// @include _shared
// ============================================================================
// execute-delivery-task — Module B. Executes ONE decomposed task and parks the
// output at the mandatory human-QA checkpoint (qa_pending). Nothing is ever
// marked client-ready without explicit human approval (qa-task function).
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
  const { task_id } = body;
  if (!task_id) return json({ error: 'task_id is required' }, 400);

  try {
    const task = (await dbSelect('delivery_tasks', `id=eq.${task_id}&limit=1`, token))[0];
    if (!task) return json({ error: 'Task not found' }, 404);
    if (!['todo', 'qa_rejected', 'failed'].includes(task.status)) {
      return json({ error: `Task is ${task.status} — only todo/qa_rejected/failed tasks can be executed` }, 422);
    }

    const run = (await dbSelect('delivery_runs', `id=eq.${task.delivery_run_id}&limit=1`, token))[0];
    const proposal = (await dbSelect('proposals', `id=eq.${run.proposal_id}&limit=1`, token))[0];
    const job = (await dbSelect('job_postings', `id=eq.${proposal.job_posting_id}&limit=1`, token))[0];

    await dbPatch('delivery_tasks', `id=eq.${task_id}`, { status: 'running' }, token);

    const memories = await dbSelect(
      'workspace_memories',
      `workspace_id=eq.${run.workspace_id}&order=updated_at.desc&limit=10`,
      token,
    );
    const memoryBlock = memories.map((m: any) => `- [${m.kind}] ${m.content.slice(0, 300)}`).join('\n') || '(none)';

    const output = await aiChat([
      { role: 'system', content: `You are The Builder, Seerist's delivery agent executing one task of a won contract on the ${run.target_stack} stack. Produce the complete, client-ready work product for THIS task only (code, copy, schema, config, or documentation as appropriate). Be concrete and complete — this output goes to human QA next. If the task needs code, write real ${run.target_stack === 'instantdb' ? 'InstantDB (typed schema, @instantdb/react)' : 'InsForge (Postgres + @insforge/sdk)'} code.` },
      { role: 'user', content: `CONTRACT: ${job?.title}\nQA feedback from previous attempt: ${task.qa_note || '(first attempt)'}\nWORKSPACE MEMORY:\n${memoryBlock}\n\nTASK ${task.position + 1}: ${task.description}\n\nContext (job description):\n${(job?.description || '').slice(0, 3000)}` },
    ], token, { maxTokens: 3000, temperature: 0.4 });

    const [updated] = await dbPatch('delivery_tasks', `id=eq.${task_id}`, {
      status: 'qa_pending',
      agent_output: output,
      qa_note: null,
    }, token);

    // Run enters QA state once any task awaits review.
    if (run.status === 'planning' || run.status === 'running') {
      const trace = Array.isArray(run.openhands_trace) ? run.openhands_trace : [];
      trace.push({ at: new Date().toISOString(), event: 'task_executed', task_id, position: task.position });
      await dbPatch('delivery_runs', `id=eq.${run.id}`, { status: 'qa', openhands_trace: trace }, token);
    }

    await logPersona({
      workspace_id: run.workspace_id,
      persona: 'The Builder',
      action: 'execute_delivery_task',
      params: { run_id: run.id, task_id, position: task.position },
      result: `Task output ready for human QA (${output.length} chars)`,
      created_by: userId,
    }, token);

    return json({ task: updated });
  } catch (e) {
    console.error(e);
    try {
      await dbPatch('delivery_tasks', `id=eq.${body.task_id}`, { status: 'failed' }, token!);
    } catch { /* best effort */ }
    return json({ error: e instanceof Error ? e.message : 'task execution failed' }, 500);
  }
}
