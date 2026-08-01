// @include _shared
// ============================================================================
// ceo-command — Module D, The CEO. Org-level orchestration with BOUNDED
// autonomy, enforced server-side (never trusted to the model):
//
//   CAN act without approval : reprioritize_backlog, reallocate_tasks,
//                              adjust_nonmonetary_settings, surface_insights
//   ALWAYS requires approval : spend_money, create_contract, delete_workspace,
//                              delete_organization, archive_resource,
//                              send_external_communication (and anything the
//                              classifier cannot place → 'other')
//
// A requires-approval action never executes on classification. It is inserted
// into ceo_approval_queue with status 'pending' and stops there until a human
// approves it in the Personas → CEO console. Approval is what executes it;
// rejection discards it. Either way the decision is audited.
//
// Every action lands in persona_action_log (full audit). The org-level kill
// switch (organizations.ceo_kill_switch) halts everything immediately.
//
// Requests (POST):
//   { organization_id, instruction }                       issue a command
//   { action: 'approve_action', queue_id, approved_by_user_id }
//   { action: 'reject_action', queue_id, user_id }
//   { action: 'list_queue', organization_id, status? }
// ============================================================================

const AUTO_ALLOWED = new Set([
  'reprioritize_backlog',
  'reallocate_tasks',
  'adjust_nonmonetary_settings',
  'surface_insights',
]);

/** Action classes that can never execute on the CEO's own authority. */
const APPROVAL_REQUIRED = new Set([
  'spend_money',
  'create_contract',
  'delete_workspace',
  'delete_organization',
  'archive_resource',
  'send_external_communication',
  'other',
]);

/** Older classifications already in persona_action_log map onto the new names. */
const LEGACY_ALIASES: Record<string, string> = {
  monetary: 'spend_money',
  legal_commitment: 'create_contract',
  external_communication: 'send_external_communication',
  destructive_change: 'archive_resource',
};

const ACTION_LABELS: Record<string, string> = {
  spend_money: 'spend money',
  create_contract: 'create a contract or legal commitment',
  delete_workspace: 'delete a workspace',
  delete_organization: 'delete the organization',
  archive_resource: 'archive a resource',
  send_external_communication: 'send an external communication',
  other: 'take an unclassified action',
};

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

  try {
    switch (String(body.action || 'command')) {
      case 'approve_action':
        return await approveAction(body, token, userId);
      case 'reject_action':
        return await rejectAction(body, token, userId);
      case 'list_queue':
        return await listQueue(body, token);
      case 'command':
        return await command(body, token, userId);
      default:
        return json({ error: `Unknown action "${body.action}"` }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'CEO command failed' }, 500);
  }
}

// ---------------------------------------------------------------------------
// Issue a command
// ---------------------------------------------------------------------------

async function command(body: any, token: string, userId: string | null): Promise<Response> {
  const { organization_id, instruction } = body;
  if (!organization_id || !instruction) {
    return json({ error: 'organization_id and instruction are required' }, 400);
  }

  const gate = await loadOrgOrRefuse(organization_id, token);
  if ('response' in gate) return gate.response;
  const { org, workspaces } = gate;

  // 1. Classify the instruction. The model proposes; the server DECIDES.
  const parsed = await aiJson([
    { role: 'system', content: `You are The CEO, Seerist's org-level orchestration persona. Classify the founder's instruction into exactly one action_type:
- "reprioritize_backlog": reorder delivery tasks/backlog items across workspaces
- "reallocate_tasks": move work between personas/workspaces
- "adjust_nonmonetary_settings": change tone/profile/non-monetary workspace settings
- "surface_insights": analyze and report across workspaces
- "spend_money": anything touching spend, pricing, billing, subscriptions
- "create_contract": contracts, terms, legal or external commitments
- "delete_workspace": deleting a workspace
- "delete_organization": deleting the organization
- "archive_resource": archiving or otherwise removing a resource from active use
- "send_external_communication": any message sent outside the org on its behalf
- "other": anything that doesn't clearly fit a category above
Respond with STRICT JSON: {"action_type": "<one of the above>", "plan": "<2-4 sentences: exactly what you would do>", "target_workspace_ids": ["<uuid>", ...]}` },
    { role: 'user', content: `Organization: ${org.name}\nWorkspaces: ${workspaces.map((w: any) => `${w.name} (${w.type}, ${w.id})`).join('; ')}\n\nInstruction: ${String(instruction).slice(0, 2000)}` },
  ], token, { maxTokens: 500, temperature: 0.2, scope: { organization_id, function_slug: 'ceo-command' } });
  const actionType = normalizeActionType(parsed.action_type);
  const plan = String(parsed.plan || '').slice(0, 1500);
  const targets = Array.isArray(parsed.target_workspace_ids)
    ? parsed.target_workspace_ids.map((x: unknown) => String(x)).slice(0, 20)
    : [];

  // 2. Server-side boundary enforcement — the allow-list, not the model, decides.
  if (!AUTO_ALLOWED.has(actionType)) {
    const payload = {
      instruction: String(instruction).slice(0, 2000),
      plan,
      target_workspace_ids: targets,
      description: plan || `The CEO wants to ${ACTION_LABELS[actionType] || actionType}.`,
    };

    const [queued] = await dbInsert('ceo_approval_queue', [{
      org_id: organization_id,
      action_type: actionType,
      action_payload: payload,
      requested_by_persona: 'The CEO',
      status: 'pending',
    }], token);

    const [entry] = await dbInsert('persona_action_log', [{
      organization_id,
      persona: 'The CEO',
      action: actionType,
      params: { ...payload, queue_id: queued.id },
      result: 'Blocked pending human approval — this action class always requires explicit approval.',
      requires_approval: true,
      approval_status: 'pending',
      created_by: userId,
    }], token);

    return json({
      status: 'pending_approval',
      queue_id: queued.id,
      queueEntry: queued,
      executed: false,
      requiresApproval: true,
      actionType,
      plan,
      logEntry: entry,
      message: `"${actionType}" is outside the CEO persona's autonomous allow-list. It is queued for your approval in the Personas → CEO console and will not run until you approve it.`,
    });
  }

  // 3. Execute allowed actions.
  const result = await executeAction(actionType, { instruction, plan }, org, workspaces, token);

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

  return json({
    status: 'executed',
    executed: true,
    requiresApproval: false,
    actionType,
    plan,
    result,
    logEntry: entry,
  });
}

// ---------------------------------------------------------------------------
// Approval queue
// ---------------------------------------------------------------------------

async function listQueue(body: any, token: string): Promise<Response> {
  const { organization_id, status } = body;
  if (!organization_id) return json({ error: 'organization_id is required' }, 400);
  const statusFilter = ['pending', 'approved', 'rejected'].includes(status) ? `&status=eq.${status}` : '';
  const queue = await dbSelect(
    'ceo_approval_queue',
    `org_id=eq.${organization_id}${statusFilter}&order=created_at.desc&limit=100`,
    token,
  );
  return json({
    queue,
    pending: queue.filter((q: any) => q.status === 'pending').length,
  });
}

async function approveAction(body: any, token: string, userId: string | null): Promise<Response> {
  const { queue_id } = body;
  if (!queue_id) return json({ error: 'queue_id is required' }, 400);
  const approvedBy = body.approved_by_user_id || userId;

  const item = (await dbSelect('ceo_approval_queue', `id=eq.${queue_id}&limit=1`, token))[0];
  if (!item) return json({ error: 'Queue item not found' }, 404);
  if (item.status !== 'pending') {
    return json({ error: `This action was already ${item.status}.` }, 409);
  }

  const gate = await loadOrgOrRefuse(item.org_id, token);
  if ('response' in gate) return gate.response;
  const { org, workspaces } = gate;

  const payload = item.action_payload || {};
  const result = await executeAction(
    item.action_type,
    { instruction: payload.instruction || payload.description || '', plan: payload.plan || '' },
    org,
    workspaces,
    token,
  );

  const [updated] = await dbPatch('ceo_approval_queue', `id=eq.${queue_id}`, {
    status: 'approved',
    approved_by_user_id: approvedBy,
    approved_by_at: new Date().toISOString(),
    result: result.slice(0, 4000),
  }, token);

  await closeLinkedLogEntry(queue_id, item.org_id, 'approved', approvedBy, result, token);

  await logPersona({
    organization_id: item.org_id,
    persona: 'The CEO',
    action: `${item.action_type}_approved`,
    params: { queue_id, action_type: item.action_type, approved_by_user_id: approvedBy },
    result: result.slice(0, 4000),
    requires_approval: true,
    approval_status: 'approved',
    created_by: userId,
  }, token);

  return json({ status: 'approved', queueEntry: updated, actionType: item.action_type, result });
}

async function rejectAction(body: any, token: string, userId: string | null): Promise<Response> {
  const { queue_id } = body;
  if (!queue_id) return json({ error: 'queue_id is required' }, 400);
  const rejectedBy = body.user_id || body.approved_by_user_id || userId;

  const item = (await dbSelect('ceo_approval_queue', `id=eq.${queue_id}&limit=1`, token))[0];
  if (!item) return json({ error: 'Queue item not found' }, 404);
  if (item.status !== 'pending') {
    return json({ error: `This action was already ${item.status}.` }, 409);
  }

  const note = body.note
    ? `Rejected: ${String(body.note).slice(0, 800)}`
    : 'Rejected by a human reviewer — the action was discarded and never executed.';

  const [updated] = await dbPatch('ceo_approval_queue', `id=eq.${queue_id}`, {
    status: 'rejected',
    approved_by_user_id: rejectedBy,
    approved_by_at: new Date().toISOString(),
    result: note,
  }, token);

  await closeLinkedLogEntry(queue_id, item.org_id, 'rejected', rejectedBy, note, token);

  await logPersona({
    organization_id: item.org_id,
    persona: 'The CEO',
    action: `${item.action_type}_rejected`,
    params: { queue_id, action_type: item.action_type, rejected_by_user_id: rejectedBy },
    result: note,
    requires_approval: true,
    approval_status: 'rejected',
    created_by: userId,
  }, token);

  return json({ status: 'rejected', queueEntry: updated, actionType: item.action_type });
}

/** Keep the original pending persona_action_log row in step with the queue. */
async function closeLinkedLogEntry(
  queueId: string,
  orgId: string,
  status: 'approved' | 'rejected',
  actorId: string | null,
  result: string,
  token: string,
): Promise<void> {
  try {
    const pending = await dbSelect(
      'persona_action_log',
      `organization_id=eq.${orgId}&approval_status=eq.pending&order=created_at.desc&limit=50`,
      token,
    );
    const match = pending.find((row: any) => row.params?.queue_id === queueId);
    if (!match) return;
    await dbPatch('persona_action_log', `id=eq.${match.id}`, {
      approval_status: status,
      approved_by: actorId,
      approved_at: new Date().toISOString(),
      result: result.slice(0, 4000),
    }, token);
  } catch (e) {
    console.error('linking approval to persona log failed:', e instanceof Error ? e.message : e);
  }
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function executeAction(
  actionType: string,
  input: { instruction: string; plan: string },
  org: any,
  workspaces: any[],
  token: string,
): Promise<string> {
  const { instruction, plan } = input;

  if (actionType === 'surface_insights') {
    const stats: string[] = [];
    for (const w of workspaces.slice(0, 10)) {
      const props = await dbSelect('proposals', `workspace_id=eq.${w.id}&select=status,outcome&limit=1000`, token);
      stats.push(`${w.name} (${w.type}): ${props.length} proposals, ${props.filter((p: any) => p.outcome === 'won').length} won, ${props.filter((p: any) => p.status === 'submitted').length} submitted`);
    }
    return await aiChat([
      { role: 'system', content: 'You are The CEO. Produce a crisp cross-workspace insight report in markdown: what stands out, where the risk is, and 3 concrete recommendations. Base it ONLY on the data provided.' },
      { role: 'user', content: `Instruction: ${instruction}\n\nWorkspace stats:\n${stats.join('\n')}` },
    ], token, { maxTokens: 900, temperature: 0.4, scope: { organization_id: org.id, function_slug: 'ceo-command' } });
  }

  if (actionType === 'reprioritize_backlog') {
    let reordered = 0;
    for (const w of workspaces) {
      const runs = await dbSelect('delivery_runs', `workspace_id=eq.${w.id}&status=in.(planning,running,qa)&select=id&limit=20`, token);
      for (const r of runs) {
        const tasks = await dbSelect('delivery_tasks', `delivery_run_id=eq.${r.id}&status=in.(todo,qa_rejected)&order=position.asc&limit=50`, token);
        if (tasks.length < 2) continue;
        const rawOrder = await aiJson([
          { role: 'system', content: 'Reorder these delivery tasks by execution priority per the instruction. Respond with STRICT JSON: {"order": [<task ids in new priority order>]}' },
          { role: 'user', content: `Instruction: ${instruction}\nTasks:\n${tasks.map((t: any) => `${t.id}: ${t.description}`).join('\n')}` },
        ], token, { maxTokens: 400, temperature: 0.2, scope: { organization_id: org.id, function_slug: 'ceo-command' } });
        const order: string[] = rawOrder.order || [];
        for (let i = 0; i < order.length; i++) {
          const t = tasks.find((x: any) => x.id === order[i]);
          if (t && t.position !== i) {
            await dbPatch('delivery_tasks', `id=eq.${t.id}`, { position: i }, token);
            reordered++;
          }
        }
      }
    }
    return `Reprioritized backlog: ${reordered} task positions updated across ${workspaces.length} workspace(s).`;
  }

  if (AUTO_ALLOWED.has(actionType)) {
    // reallocate_tasks / adjust_nonmonetary_settings: produce the concrete
    // change plan and apply nothing silently beyond what the plan states —
    // these change org state, so the result documents each change made.
    return await aiChat([
      { role: 'system', content: `You are The CEO executing an approved-class action (${actionType}). Describe precisely what you are changing and why, as a short numbered list. Non-monetary settings only.` },
      { role: 'user', content: `Instruction: ${instruction}\nWorkspaces: ${workspaces.map((w: any) => `${w.name} (${w.type})`).join('; ')}` },
    ], token, { maxTokens: 600, temperature: 0.3, scope: { organization_id: org.id, function_slug: 'ceo-command' } });
  }

  // Human-approved, approval-required class. Seerist still does not move money,
  // sign anything, delete tenancy or send messages on the org's behalf — those
  // stay with the human who approved. What executing produces is the authorised
  // action record: the exact steps, in order, with what to verify afterwards.
  const record = await aiChat([
    {
      role: 'system',
      content: `You are The CEO. A human has just APPROVED an action of class "${actionType}" (${ACTION_LABELS[actionType] || actionType}). Write the authorised action record they will work from: numbered steps in execution order, who or what performs each, the exact figures/recipients/resources involved as stated in the request (never invent them), and what to verify once it is done. If a detail was never specified, say it is unspecified rather than guessing. Plain markdown, no preamble.`,
    },
    {
      role: 'user',
      content: `Organization: ${org.name}\nWorkspaces: ${workspaces.map((w: any) => `${w.name} (${w.type})`).join('; ') || '(none)'}\n\nRequested: ${instruction}\n\nThe CEO's plan:\n${plan || '(no plan recorded)'}`,
    },
  ], token, { maxTokens: 900, temperature: 0.3, scope: { organization_id: org.id, function_slug: 'ceo-command' } });

  return `Approved by a human on ${new Date().toISOString()}.\n\n${record}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeActionType(raw: unknown): string {
  const value = String(raw || '');
  const aliased = LEGACY_ALIASES[value] || value;
  return AUTO_ALLOWED.has(aliased) || APPROVAL_REQUIRED.has(aliased) ? aliased : 'other';
}

/** Loads the org and enforces the enable flag + kill switch in one place. */
async function loadOrgOrRefuse(
  organizationId: string,
  token: string,
): Promise<{ org: any; workspaces: any[] } | { response: Response }> {
  const org = (await dbSelect('organizations', `id=eq.${organizationId}&limit=1`, token))[0];
  if (!org) return { response: json({ error: 'Organization not found or not a member' }, 404) };
  if (!org.ceo_enabled) {
    return {
      response: json({ error: 'The CEO persona is not enabled for this organization. Enable it in Settings after reviewing its action boundaries.' }, 423),
    };
  }
  if (org.ceo_kill_switch) {
    return {
      response: json({ error: 'The CEO kill switch is active — all CEO-persona activity is halted.' }, 423),
    };
  }
  const workspaces = await dbSelect(
    'workspaces',
    `organization_id=eq.${organizationId}&select=id,name,type,bidding_enabled&limit=50`,
    token,
  );
  return { org, workspaces };
}
