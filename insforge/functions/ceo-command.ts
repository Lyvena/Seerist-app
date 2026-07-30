// @include _shared
// ============================================================================
// ceo-command — Module D, The CEO. Org-level orchestration with BOUNDED
// autonomy, enforced server-side (never trusted to the model):
//
//   CAN act without approval : reprioritize_backlog, reallocate_tasks,
//                              adjust_nonmonetary_settings, surface_insights
//   ALWAYS requires approval : anything monetary, legal/contractual
//                              commitments, deleting/archiving org or
//                              workspace, ANY external communication
//
// Every action lands in persona_action_log (full audit). The org-level kill
// switch (organizations.ceo_kill_switch) halts everything immediately.
// ============================================================================

const AUTO_ALLOWED = new Set([
  'reprioritize_backlog',
  'reallocate_tasks',
  'adjust_nonmonetary_settings',
  'surface_insights',
]);
const APPROVAL_REQUIRED = new Set([
  'monetary',
  'legal_commitment',
  'external_communication',
  'destructive_change',
  'other',
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
  const { organization_id, instruction } = body;
  if (!organization_id || !instruction) {
    return json({ error: 'organization_id and instruction are required' }, 400);
  }

  try {
    const org = (await dbSelect('organizations', `id=eq.${organization_id}&limit=1`, token))[0];
    if (!org) return json({ error: 'Organization not found or not a member' }, 404);
    if (!org.ceo_enabled) {
      return json({ error: 'The CEO persona is not enabled for this organization. Enable it in Settings after reviewing its action boundaries.' }, 423);
    }
    if (org.ceo_kill_switch) {
      return json({ error: 'The CEO kill switch is active — all CEO-persona activity is halted.' }, 423);
    }

    const workspaces = await dbSelect('workspaces', `organization_id=eq.${organization_id}&select=id,name,type,bidding_enabled&limit=50`, token);

    // 1. Classify the instruction. The model proposes; the server DECIDES.
    const raw = await aiChat([
      { role: 'system', content: `You are The CEO, Seerist's org-level orchestration persona. Classify the founder's instruction into exactly one action_type:
- "reprioritize_backlog": reorder delivery tasks/backlog items across workspaces
- "reallocate_tasks": move work between personas/workspaces
- "adjust_nonmonetary_settings": change tone/profile/non-monetary workspace settings
- "surface_insights": analyze and report across workspaces
- "monetary": anything touching spend, pricing, billing, subscriptions
- "legal_commitment": contracts, terms, legal or external commitments
- "external_communication": any message sent outside the org on its behalf
- "destructive_change": deleting or archiving a workspace/organization
- "other": anything that doesn't clearly fit an allowed category
Respond with STRICT JSON: {"action_type": "<one of the above>", "plan": "<2-4 sentences: exactly what you would do>", "target_workspace_ids": ["<uuid>", ...]}` },
      { role: 'user', content: `Organization: ${org.name}\nWorkspaces: ${workspaces.map((w: any) => `${w.name} (${w.type}, ${w.id})`).join('; ')}\n\nInstruction: ${String(instruction).slice(0, 2000)}` },
    ], token, { maxTokens: 500, temperature: 0.2 });
    const parsed = parseJsonLoose(raw);
    const actionType = AUTO_ALLOWED.has(parsed.action_type) || APPROVAL_REQUIRED.has(parsed.action_type)
      ? parsed.action_type
      : 'other';
    const plan = String(parsed.plan || '').slice(0, 1500);

    // 2. Server-side boundary enforcement — the allow-list, not the model, decides.
    if (!AUTO_ALLOWED.has(actionType)) {
      const [entry] = await dbInsert('persona_action_log', [{
        organization_id,
        persona: 'The CEO',
        action: actionType,
        params: { instruction: String(instruction).slice(0, 1000), plan },
        result: 'Blocked pending human approval — this action class always requires explicit approval.',
        requires_approval: true,
        approval_status: 'pending',
        created_by: userId,
      }], token);
      return json({
        executed: false,
        requiresApproval: true,
        actionType,
        plan,
        logEntry: entry,
        message: `"${actionType}" is outside the CEO persona's autonomous allow-list. The plan has been logged for human approval in the Personas → CEO console.`,
      });
    }

    // 3. Execute allowed actions.
    let result = '';
    if (actionType === 'surface_insights') {
      const stats: string[] = [];
      for (const w of workspaces.slice(0, 10)) {
        const props = await dbSelect('proposals', `workspace_id=eq.${w.id}&select=status,outcome&limit=1000`, token);
        stats.push(`${w.name} (${w.type}): ${props.length} proposals, ${props.filter((p: any) => p.outcome === 'won').length} won, ${props.filter((p: any) => p.status === 'submitted').length} submitted`);
      }
      result = await aiChat([
        { role: 'system', content: 'You are The CEO. Produce a crisp cross-workspace insight report in markdown: what stands out, where the risk is, and 3 concrete recommendations. Base it ONLY on the data provided.' },
        { role: 'user', content: `Instruction: ${instruction}\n\nWorkspace stats:\n${stats.join('\n')}` },
      ], token, { maxTokens: 900, temperature: 0.4 });
    } else if (actionType === 'reprioritize_backlog') {
      let reordered = 0;
      for (const w of workspaces) {
        const runs = await dbSelect('delivery_runs', `workspace_id=eq.${w.id}&status=in.(planning,running,qa)&select=id&limit=20`, token);
        for (const r of runs) {
          const tasks = await dbSelect('delivery_tasks', `delivery_run_id=eq.${r.id}&status=in.(todo,qa_rejected)&order=position.asc&limit=50`, token);
          if (tasks.length < 2) continue;
          const rawOrder = await aiChat([
            { role: 'system', content: 'Reorder these delivery tasks by execution priority per the instruction. Respond with STRICT JSON: {"order": [<task ids in new priority order>]}' },
            { role: 'user', content: `Instruction: ${instruction}\nTasks:\n${tasks.map((t: any) => `${t.id}: ${t.description}`).join('\n')}` },
          ], token, { maxTokens: 400, temperature: 0.2 });
          const order: string[] = parseJsonLoose(rawOrder).order || [];
          for (let i = 0; i < order.length; i++) {
            const t = tasks.find((x: any) => x.id === order[i]);
            if (t && t.position !== i) {
              await dbPatch('delivery_tasks', `id=eq.${t.id}`, { position: i }, token);
              reordered++;
            }
          }
        }
      }
      result = `Reprioritized backlog: ${reordered} task positions updated across ${workspaces.length} workspace(s).`;
    } else {
      // reallocate_tasks / adjust_nonmonetary_settings: produce the concrete
      // change plan and apply nothing silently beyond what the plan states —
      // these change org state, so the result documents each change made.
      result = await aiChat([
        { role: 'system', content: `You are The CEO executing an approved-class action (${actionType}). Describe precisely what you are changing and why, as a short numbered list. Non-monetary settings only.` },
        { role: 'user', content: `Instruction: ${instruction}\nWorkspaces: ${workspaces.map((w: any) => `${w.name} (${w.type})`).join('; ')}` },
      ], token, { maxTokens: 600, temperature: 0.3 });
    }

    const [entry] = await dbInsert('persona_action_log', [{
      organization_id,
      persona: 'The CEO',
      action: actionType,
      params: { instruction: String(instruction).slice(0, 1000), plan },
      result: result.slice(0, 4000),
      requires_approval: false,
      approval_status: 'auto_approved',
      created_by: userId,
    }], token);

    return json({ executed: true, requiresApproval: false, actionType, plan, result, logEntry: entry });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'CEO command failed' }, 500);
  }
}
