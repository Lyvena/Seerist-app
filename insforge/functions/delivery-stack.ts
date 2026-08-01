// @include _shared
// ============================================================================
// delivery-stack — provisions the real backend a client deliverable runs on,
// through the InsForge **co-branded** partnership API.
//
// Why co-branded and not white-label: in co-branded mode the client is a real
// InsForge user, linked by their own email. They can log into InsForge, they
// own the project outright, and they pay InsForge directly under their own
// plan. That is the honest shape for delivered client work — the agency hands
// over a backend the client controls, rather than reselling infrastructure or
// holding the client's data behind Seerist's account. White-label would hide
// InsForge entirely and put the bill on Seerist; that is a different commercial
// agreement and is deliberately not implemented here.
//   Docs: https://docs.insforge.dev/partnership
//
// Requires two project secrets, issued after applying at partnerships@insforge.dev:
//   INSFORGE_PARTNER_ID      your partner identifier
//   INSFORGE_PARTNER_SECRET  sent as the X-Partnership-Secret header
// Without them every operation returns 501 with the exact next step, the same
// way billing behaved before Creem was configured.
//
// NOTE: only the InsForge stack is provisioned. `instantdb` runs are refused
// with a clear message rather than half-provisioned.
//
// Operations (POST { op, ... }):
//   status       { }                     is the partnership configured?
//   provision    { delivery_run_id, ... } create/sync the client's project
//   attach       { delivery_run_id, project_id }  use an existing project
//   credentials  { delivery_run_id }     fetch the live api_key (audited)
//   refresh      { delivery_run_id }     re-read project status from InsForge
// ============================================================================

const PARTNER_BASE = Deno.env.get('INSFORGE_PARTNER_BASE_URL') ?? 'https://api.insforge.dev';
const REGIONS = ['us-east', 'us-west', 'ap-southeast', 'eu-central'];
const INSTANCE_TYPES = ['nano', 'micro', 'small', 'medium', 'large', 'xl', '2xl', '4xl', '8xl', '16xl'];

interface PartnerConfig { partnerId: string; secret: string }

function partnerConfig(): PartnerConfig | null {
  const partnerId = Deno.env.get('INSFORGE_PARTNER_ID');
  const secret = Deno.env.get('INSFORGE_PARTNER_SECRET');
  return partnerId && secret ? { partnerId, secret } : null;
}

async function partner(path: string, cfg: PartnerConfig, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${PARTNER_BASE}/partnership/v1/${cfg.partnerId}${path}`, {
    ...init,
    headers: {
      'X-Partnership-Secret': cfg.secret,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`InsForge partnership ${path} failed (${res.status}): ${data.message || JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

const SETUP_MESSAGE =
  'The InsForge partnership is not configured yet. Apply at partnerships@insforge.dev for a CO-BRANDED partnership, then add the INSFORGE_PARTNER_ID and INSFORGE_PARTNER_SECRET project secrets. Until then delivery still works — The Builder writes InsForge code, you just provision the client project by hand.';

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

  const op = String(body.op || body.action || 'status');
  const cfg = partnerConfig();

  try {
    if (op === 'status') {
      return json({
        configured: Boolean(cfg),
        model: 'co-branded',
        regions: REGIONS,
        instance_types: INSTANCE_TYPES,
        note: cfg
          ? 'Co-branded partnership active. Provisioned projects belong to the client, who signs in to InsForge with the same email and pays InsForge directly.'
          : SETUP_MESSAGE,
        docs: 'https://docs.insforge.dev/partnership',
      });
    }

    const { delivery_run_id } = body;
    if (!delivery_run_id) return json({ error: 'delivery_run_id is required' }, 400);

    const run = (await dbSelect('delivery_runs', `id=eq.${delivery_run_id}&limit=1`, token))[0];
    if (!run) return json({ error: 'Delivery run not found' }, 404);

    if (op === 'refresh' || op === 'credentials') {
      if (!cfg) return json({ error: SETUP_MESSAGE, setupNeeded: true }, 501);
      if (!run.stack_project_id || !run.stack_account_id) {
        return json({ error: 'This run has no provisioned InsForge project yet.' }, 409);
      }
      const data = await partner(`/${run.stack_account_id}/${run.stack_project_id}/metadata`, cfg);
      const project = data.project || {};

      if (op === 'refresh') {
        return json({ project: { id: project.id, access_host: project.access_host, status: project.status } });
      }

      // Handing over a live credential is worth an audit line every time.
      await logPersona({
        workspace_id: run.workspace_id,
        persona: 'The Builder',
        action: 'read_stack_credentials',
        params: { delivery_run_id, project_id: run.stack_project_id },
        result: 'Project API key read for the deliverable handoff.',
        created_by: userId,
      }, token);

      return json({
        access_host: project.access_host,
        api_key: project.api_key,
        status: project.status,
        note: 'Live project credentials, read fresh from InsForge — Seerist does not store the API key.',
      });
    }

    if (op === 'attach') {
      if (!cfg) return json({ error: SETUP_MESSAGE, setupNeeded: true }, 501);
      const projectId = String(body.project_id || '');
      if (!projectId) return json({ error: 'project_id is required' }, 400);
      if (!run.stack_account_id) {
        return json({ error: 'Connect the client account first by running provision.' }, 409);
      }
      const data = await partner(`/${run.stack_account_id}/${projectId}/metadata`, cfg);
      const project = data.project || {};
      const [updated] = await dbPatch('delivery_runs', `id=eq.${delivery_run_id}`, {
        stack_project_id: project.id,
        stack_access_host: project.access_host,
        stack_provisioned_at: new Date().toISOString(),
      }, token);
      await logPersona({
        workspace_id: run.workspace_id,
        persona: 'The Builder',
        action: 'attach_stack_project',
        params: { delivery_run_id, project_id: project.id },
        result: `Attached existing InsForge project ${project.access_host}.`,
        created_by: userId,
      }, token);
      return json({ run: updated, project });
    }

    if (op !== 'provision') {
      return json({ error: 'op must be one of: status, provision, attach, credentials, refresh' }, 400);
    }

    // --- provision ---------------------------------------------------------
    if (run.target_stack === 'instantdb') {
      return json({
        error: 'This run targets InstantDB. Seerist only provisions InsForge backends; switch the run to the InsForge stack or set the project up manually.',
      }, 422);
    }
    if (!cfg) return json({ error: SETUP_MESSAGE, setupNeeded: true }, 501);
    if (run.stack_project_id) {
      return json({ error: 'This run already has a provisioned project.', project_id: run.stack_project_id }, 409);
    }

    // Who owns the project. Defaults to the Seerist user requesting it; pass a
    // client email to have the client own and pay for it from day one.
    let ownerEmail = body.client_email ? String(body.client_email).trim() : '';
    let ownerName = body.client_name ? String(body.client_name).trim() : '';
    if (!ownerEmail && userId) {
      const profile = (await dbSelect('profiles', `id=eq.${userId}&select=email,name&limit=1`, token))[0];
      ownerEmail = profile?.email || '';
      ownerName = ownerName || profile?.name || ownerEmail;
    }
    if (!ownerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) {
      return json({ error: 'A valid client_email is required (it becomes the InsForge account that owns the project).' }, 400);
    }

    const region = REGIONS.includes(body.region) ? body.region : 'us-east';
    const instanceType = INSTANCE_TYPES.includes(body.instance_type) ? body.instance_type : 'nano';

    // Name the project after the contract so it is recognisable in InsForge.
    const proposal = run.proposal_id
      ? (await dbSelect('proposals', `id=eq.${run.proposal_id}&limit=1`, token))[0]
      : null;
    const job = proposal?.job_posting_id
      ? (await dbSelect('job_postings', `id=eq.${proposal.job_posting_id}&select=title&limit=1`, token))[0]
      : null;
    const projectName = slugify(body.project_name || job?.title || `seerist-delivery-${String(run.id).slice(0, 8)}`);

    // 1. Link the client's InsForge account by email (idempotent upstream).
    const accountId = run.stack_account_id
      || (await partner('/connect-user', cfg, {
        method: 'POST',
        body: JSON.stringify({ name: ownerName || ownerEmail, email: ownerEmail }),
      })).account?.id;
    if (!accountId) return json({ error: 'InsForge did not return an account id for that email.' }, 502);

    // 2. Create the project under that account.
    const sync = await partner(`/${accountId}/sync-project`, cfg, {
      method: 'POST',
      body: JSON.stringify({ project_name: projectName, region, instance_type: instanceType }),
    });

    // The client's InsForge plan caps active projects. Rather than failing, hand
    // back the projects they already have so a human can attach one instead.
    if (sync.success === false) {
      await dbPatch('delivery_runs', `id=eq.${delivery_run_id}`, {
        stack_account_id: accountId,
        stack_owner_email: ownerEmail,
      }, token);
      return json({
        provisioned: false,
        reason: 'project_limit',
        message: sync.message || 'The client\'s InsForge plan will not allow another project.',
        candidate_projects: (sync.candidate_projects || []).map((p: any) => ({
          id: p.id, access_host: p.access_host, status: p.status,
        })),
        next_step: 'Pick one of these with op: "attach", or ask the client to upgrade their InsForge plan.',
      }, 409);
    }

    const project = sync.project || {};
    const [updated] = await dbPatch('delivery_runs', `id=eq.${delivery_run_id}`, {
      stack_account_id: accountId,
      stack_project_id: project.id,
      stack_access_host: project.access_host,
      stack_region: region,
      stack_instance_type: instanceType,
      stack_owner_email: ownerEmail,
      stack_provisioned_at: new Date().toISOString(),
    }, token);

    const trace = Array.isArray(run.openhands_trace) ? run.openhands_trace : [];
    trace.push({
      at: new Date().toISOString(),
      event: 'stack_provisioned',
      project_id: project.id,
      access_host: project.access_host,
      region,
      instance_type: instanceType,
    });
    await dbPatch('delivery_runs', `id=eq.${delivery_run_id}`, { openhands_trace: trace }, token);

    await logPersona({
      workspace_id: run.workspace_id,
      persona: 'The Builder',
      action: 'provision_delivery_stack',
      params: { delivery_run_id, project_id: project.id, region, instance_type: instanceType, owner: ownerEmail },
      result: `Provisioned InsForge project ${project.access_host} for ${ownerEmail}. The client owns it and can sign in to InsForge with that email.`,
      created_by: userId,
    }, token);

    return json({
      provisioned: true,
      run: updated,
      project: { id: project.id, access_host: project.access_host, status: project.status },
      owner_email: ownerEmail,
      note: `${ownerEmail} now owns this project on InsForge and can manage it by signing in with that email. Seerist stores the host but never the API key.`,
    }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'delivery stack operation failed' }, 502);
  }
}

/** InsForge project names: lowercase, hyphenated, no surprises. */
function slugify(input: string): string {
  const slug = String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return slug || 'seerist-delivery';
}
