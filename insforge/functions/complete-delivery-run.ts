// @include _shared
// ============================================================================
// complete-delivery-run — Module B handoff. Enforced server-side: a run can
// only be marked delivered when EVERY task passed human QA. Packaging channel
// is recorded (drive / github / gitlab / download); a reusable skill is
// extracted into workspace memory (Hermes-style learning from completed runs).
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
  const { run_id, packaging_channel } = body;
  if (!run_id) return json({ error: 'run_id is required' }, 400);

  try {
    const run = (await dbSelect('delivery_runs', `id=eq.${run_id}&limit=1`, token))[0];
    if (!run) return json({ error: 'Run not found' }, 404);
    if (run.status === 'delivered') return json({ error: 'Run already delivered' }, 409);

    const tasks = await dbSelect('delivery_tasks', `delivery_run_id=eq.${run_id}&order=position.asc&limit=100`, token);
    const notApproved = tasks.filter((t: any) => t.status !== 'qa_approved');
    if (!tasks.length || notApproved.length) {
      return json({
        error: `Mandatory human QA gate: ${notApproved.length} of ${tasks.length} tasks are not QA-approved yet. Every task must pass human QA before delivery.`,
        pending: notApproved.map((t: any) => ({ id: t.id, position: t.position, status: t.status })),
      }, 422);
    }

    const channel = ['drive', 'github', 'gitlab', 'download'].includes(packaging_channel)
      ? packaging_channel
      : run.packaging_channel || 'download';

    const trace = Array.isArray(run.openhands_trace) ? run.openhands_trace : [];
    trace.push({ at: new Date().toISOString(), event: 'delivered', packaging_channel: channel, tasks: tasks.length });

    const [updated] = await dbPatch('delivery_runs', `id=eq.${run_id}`, {
      status: 'delivered',
      packaging_channel: channel,
      openhands_trace: trace,
    }, token);

    // Skill learning: extract a reusable skill from the completed run.
    try {
      const skill = await aiChat([
        { role: 'system', content: 'Extract ONE reusable delivery skill/lesson from this completed contract, phrased as an instruction future delivery runs should follow. One or two sentences. Plain text only.' },
        { role: 'user', content: tasks.map((t: any) => `Task: ${t.description}\nQA note: ${t.qa_note || 'approved clean'}`).join('\n\n').slice(0, 4000) },
      ], token, { maxTokens: 150, temperature: 0.3 });
      if (skill.trim()) {
        await dbInsert('workspace_memories', [{
          workspace_id: run.workspace_id,
          key: `skill_${run_id.slice(0, 8)}`,
          kind: 'skill',
          content: skill.trim(),
          source: 'complete-delivery-run',
        }], token);
      }
    } catch { /* non-fatal */ }

    await logPersona({
      workspace_id: run.workspace_id,
      persona: 'The Builder',
      action: 'complete_delivery_run',
      params: { run_id, packaging_channel: channel, tasks: tasks.length },
      result: 'All tasks passed human QA — run delivered.',
      created_by: userId,
    }, token);

    return json({ run: updated });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'completion failed' }, 500);
  }
}
