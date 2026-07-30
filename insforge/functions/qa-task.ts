// @include _shared
// ============================================================================
// qa-task — Module B mandatory human QA checkpoint. A human approves or
// rejects each executed task; rejects go back to the Builder with feedback.
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
  const { task_id, approve, note } = body;
  if (!task_id || typeof approve !== 'boolean') {
    return json({ error: 'task_id and approve (boolean) are required' }, 400);
  }

  try {
    const task = (await dbSelect('delivery_tasks', `id=eq.${task_id}&limit=1`, token))[0];
    if (!task) return json({ error: 'Task not found' }, 404);
    if (task.status !== 'qa_pending') {
      return json({ error: 'Only tasks awaiting QA (qa_pending) can be reviewed' }, 422);
    }

    const patch: Record<string, unknown> = approve
      ? { status: 'qa_approved', qa_approved_by: userId, qa_approved_at: new Date().toISOString(), qa_note: note || null }
      : { status: 'qa_rejected', qa_note: note || 'Rejected without note', qa_approved_by: null, qa_approved_at: null };

    const [updated] = await dbPatch('delivery_tasks', `id=eq.${task_id}`, patch, token);

    const run = (await dbSelect('delivery_runs', `id=eq.${task.delivery_run_id}&limit=1`, token))[0];
    await logPersona({
      workspace_id: run.workspace_id,
      persona: 'The Builder',
      action: approve ? 'qa_approved' : 'qa_rejected',
      params: { run_id: run.id, task_id, position: task.position },
      result: note || null,
      created_by: userId,
    }, token);

    return json({ task: updated });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'QA update failed' }, 500);
  }
}
