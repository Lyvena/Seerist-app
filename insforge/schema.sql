-- ============================================================================
-- Seerist — InsForge (Postgres) schema
-- Tenancy-first: users → organization_memberships → organizations
--                       → workspace_memberships → workspaces (agency | saas)
-- Every Module A–D record hangs off workspace_id; org-level features
-- (billing / CEO persona) hang off organization_id. All tables use RLS.
-- Apply via: node insforge/scripts/apply-schema.mjs   (POST /api/database/advance/rawsql)
-- ============================================================================

-- Helper functions are declared before the tables they reference; skip
-- creation-time body validation (bodies are validated at first execution).
set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so RLS policies don't recurse)
-- ---------------------------------------------------------------------------

create or replace function public.seerist_is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_memberships m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.seerist_is_org_admin(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_memberships m
    where m.organization_id = org and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  );
$$;

create or replace function public.seerist_is_org_owner(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_memberships m
    where m.organization_id = org and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

create or replace function public.seerist_org_of_ws(ws uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from workspaces where id = ws;
$$;

-- Workspace member OR admin of the owning organization.
create or replace function public.seerist_is_ws_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_memberships wm
    where wm.workspace_id = ws and wm.user_id = auth.uid()
  ) or exists (
    select 1 from workspaces w
    join organization_memberships m on m.organization_id = w.organization_id
    where w.id = ws and m.user_id = auth.uid() and m.role in ('owner','admin')
  );
$$;

create or replace function public.seerist_ws_of_proposal(p uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select workspace_id from proposals where id = p;
$$;

create or replace function public.seerist_ws_of_run(r uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select workspace_id from delivery_runs where id = r;
$$;

-- ---------------------------------------------------------------------------
-- Identity & tenancy
-- ---------------------------------------------------------------------------

-- The spec's `users` table: global identity, one row per email.
-- Auth (passwords, sessions, OAuth) is owned by InsForge Auth; this row mirrors
-- the auth user (same UUID) so the app can join against it.
create table if not exists profiles (
  id uuid primary key,
  email text not null unique,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_status text not null default 'trial'
    check (billing_status in ('trial','active','past_due','canceled')),
  plan text not null default 'starter',
  creem_customer_id text,
  ceo_enabled boolean not null default false,
  ceo_kill_switch boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('agency','saas')),
  name text not null,
  description text,
  ideal_client_profile text,
  portfolio text,
  tone_style text,
  product_name text,
  product_description text,
  product_url text,
  target_customer text,
  bidding_enabled boolean not null default false,
  risk_acknowledged_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- Per-platform connection state. Credentials stay null/unused until a
-- platform's developer API access exists (Upwork key is a parallel track).
-- kill_switch is the per-platform emergency stop required by the spec.
create table if not exists platform_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  platform text not null default 'upwork',
  credentials jsonb,
  status text not null default 'not_connected'
    check (status in ('not_connected','pending','active','error','killed')),
  kill_switch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform)
);

-- ---------------------------------------------------------------------------
-- Module A — Bid & Proposal Engine
-- ---------------------------------------------------------------------------

-- Manually curated, versioned per-platform product-mention policy.
-- NEVER auto-inferred from scraped ToS. Absent row => 'no_mention'.
create table if not exists policy_configs (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique,
  mention_policy text not null default 'no_mention'
    check (mention_policy in ('link_allowed','description_only','no_mention')),
  version integer not null default 1,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists job_postings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source text not null default 'extension_capture'
    check (source in ('extension_capture','api_poll','manual')),
  platform text not null default 'upwork',
  title text not null,
  description text,
  budget text,
  client_stats jsonb,
  url text,
  captured_at timestamptz not null default now(),
  captured_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  job_posting_id uuid not null references job_postings(id) on delete cascade,
  status text not null default 'new'
    check (status in ('new','scored','drafted','needs_edits','approved','submitted')),
  mode text not null check (mode in ('agency','saas')),
  draft_content text,
  fit_score integer check (fit_score between 0 and 100),
  fit_reasoning text,
  product_mentioned boolean not null default false,
  mention_policy_applied text,
  outcome text not null default 'pending'
    check (outcome in ('pending','viewed','replied','won','lost')),
  submitted_at timestamptz,
  viewed_at timestamptz,
  replied_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proposal_status_history (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Module B — Delivery Engine (OpenHands execution + Hermes memory)
-- ---------------------------------------------------------------------------

create table if not exists delivery_runs (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  status text not null default 'planning'
    check (status in ('planning','running','qa','delivered','failed','cancelled')),
  target_stack text not null default 'insforge'
    check (target_stack in ('instantdb','insforge','client_specified')),
  stack_reasoning text,
  openhands_conversation_id text,
  openhands_trace jsonb not null default '[]'::jsonb,
  packaging_channel text
    check (packaging_channel is null or packaging_channel in ('drive','github','gitlab','download')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists delivery_tasks (
  id uuid primary key default gen_random_uuid(),
  delivery_run_id uuid not null references delivery_runs(id) on delete cascade,
  position integer not null default 0,
  description text not null,
  status text not null default 'todo'
    check (status in ('todo','running','qa_pending','qa_approved','qa_rejected','done','failed')),
  agent_output text,
  qa_approved_by uuid,
  qa_approved_at timestamptz,
  qa_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Hermes-style persistent per-workspace memory: client preferences, prior
-- decisions, style guidance, the default delivery-stack decision rule, and
-- reusable skills extracted from completed delivery runs.
create table if not exists workspace_memories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  key text not null,
  kind text not null default 'note'
    check (kind in ('note','preference','decision_rule','skill')),
  content text not null,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

-- ---------------------------------------------------------------------------
-- Module C — Growth Engine
-- ---------------------------------------------------------------------------

create table if not exists growth_touchpoints (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  product_mentioned boolean not null default true,
  mention_policy text,
  attributed_signup_id uuid,
  attributed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Signups attributed back to specific bids (the Ploy-style signal loop).
create table if not exists product_signups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text,
  source text not null default 'bid_touchpoint',
  touchpoint_id uuid references growth_touchpoints(id) on delete set null,
  proposal_id uuid references proposals(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists ploybooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  strategy_config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists site_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  url text not null,
  status text not null default 'pending'
    check (status in ('pending','running','complete','failed')),
  summary text,
  positioning text,
  error text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deploy-triggered docs & site sync: output is ALWAYS a draft, never
-- auto-published.
create table if not exists deploy_sync_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  trigger_source text,
  deploy_ref text,
  change_summary text,
  docs_draft text,
  site_draft text,
  pr_url text,
  preview_url text,
  status text not null default 'draft'
    check (status in ('draft','in_review','published','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Module D — AI Employees / persona audit trail
-- ---------------------------------------------------------------------------

create table if not exists persona_action_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  persona text not null,
  action text not null,
  params jsonb not null default '{}'::jsonb,
  result text,
  requires_approval boolean not null default false,
  approval_status text not null default 'auto_approved'
    check (approval_status in ('auto_approved','pending','approved','rejected')),
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (organization_id is not null or workspace_id is not null)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_org_memberships_user on organization_memberships(user_id);
create index if not exists idx_ws_memberships_user on workspace_memberships(user_id);
create index if not exists idx_workspaces_org on workspaces(organization_id);
create index if not exists idx_job_postings_ws on job_postings(workspace_id);
create index if not exists idx_proposals_ws on proposals(workspace_id);
create index if not exists idx_proposals_status on proposals(workspace_id, status);
create index if not exists idx_psh_proposal on proposal_status_history(proposal_id);
create index if not exists idx_delivery_runs_ws on delivery_runs(workspace_id);
create index if not exists idx_delivery_tasks_run on delivery_tasks(delivery_run_id);
create index if not exists idx_touchpoints_ws on growth_touchpoints(workspace_id);
create index if not exists idx_signups_ws on product_signups(workspace_id);
create index if not exists idx_memories_ws on workspace_memories(workspace_id);
create index if not exists idx_pal_org on persona_action_log(organization_id);
create index if not exists idx_pal_ws on persona_action_log(workspace_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (system.update_updated_at ships with InsForge)
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','workspaces','platform_connections','policy_configs',
    'job_postings','proposals','delivery_runs','delivery_tasks','workspace_memories',
    'ploybooks','site_ingestion_jobs','deploy_sync_drafts'
  ] loop
    execute format(
      'drop trigger if exists %I on %I; create trigger %I before update on %I for each row execute function system.update_updated_at();',
      t || '_touch', t, t || '_touch', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_memberships enable row level security;
alter table workspaces enable row level security;
alter table workspace_memberships enable row level security;
alter table platform_connections enable row level security;
alter table policy_configs enable row level security;
alter table job_postings enable row level security;
alter table proposals enable row level security;
alter table proposal_status_history enable row level security;
alter table delivery_runs enable row level security;
alter table delivery_tasks enable row level security;
alter table workspace_memories enable row level security;
alter table growth_touchpoints enable row level security;
alter table product_signups enable row level security;
alter table ploybooks enable row level security;
alter table site_ingestion_jobs enable row level security;
alter table deploy_sync_drafts enable row level security;
alter table persona_action_log enable row level security;

-- profiles: any signed-in user can see member profiles; only self-writes.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated using (true);
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid());
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- organizations
-- Creator visibility is needed for the INSERT ... RETURNING bootstrap step
-- (membership doesn't exist yet in that instant).
drop policy if exists orgs_select on organizations;
create policy orgs_select on organizations for select to authenticated
  using (seerist_is_org_member(id) or created_by = auth.uid());
drop policy if exists orgs_insert on organizations;
create policy orgs_insert on organizations for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists orgs_update on organizations;
create policy orgs_update on organizations for update to authenticated
  using (seerist_is_org_admin(id)) with check (seerist_is_org_admin(id));
drop policy if exists orgs_delete on organizations;
create policy orgs_delete on organizations for delete to authenticated
  using (seerist_is_org_owner(id));

-- organization_memberships: bootstrap = creator adds self as owner.
-- Self-visibility (user_id = auth.uid()) is required for INSERT ... RETURNING:
-- SELECT policies evaluate with the statement snapshot, which does not yet
-- contain the row being inserted, so membership-based checks alone would fail.
drop policy if exists om_select on organization_memberships;
create policy om_select on organization_memberships for select to authenticated
  using (user_id = auth.uid() or seerist_is_org_member(organization_id));
drop policy if exists om_insert on organization_memberships;
create policy om_insert on organization_memberships for insert to authenticated
  with check (
    (user_id = auth.uid() and exists (
      select 1 from organizations o
      where o.id = organization_id and o.created_by = auth.uid()
    ))
    or seerist_is_org_admin(organization_id)
  );
drop policy if exists om_update on organization_memberships;
create policy om_update on organization_memberships for update to authenticated
  using (seerist_is_org_admin(organization_id))
  with check (seerist_is_org_admin(organization_id));
drop policy if exists om_delete on organization_memberships;
create policy om_delete on organization_memberships for delete to authenticated
  using (seerist_is_org_admin(organization_id) or user_id = auth.uid());

-- workspaces
drop policy if exists ws_select on workspaces;
create policy ws_select on workspaces for select to authenticated
  using (seerist_is_org_member(organization_id));
drop policy if exists ws_insert on workspaces;
create policy ws_insert on workspaces for insert to authenticated
  with check (seerist_is_org_admin(organization_id) and created_by = auth.uid());
drop policy if exists ws_update on workspaces;
create policy ws_update on workspaces for update to authenticated
  using (seerist_is_ws_member(id)) with check (seerist_is_ws_member(id));
drop policy if exists ws_delete on workspaces;
create policy ws_delete on workspaces for delete to authenticated
  using (seerist_is_org_admin(organization_id));

-- workspace_memberships
drop policy if exists wm_select on workspace_memberships;
create policy wm_select on workspace_memberships for select to authenticated
  using (user_id = auth.uid() or seerist_is_org_member(seerist_org_of_ws(workspace_id)));
drop policy if exists wm_insert on workspace_memberships;
create policy wm_insert on workspace_memberships for insert to authenticated
  with check (seerist_is_org_admin(seerist_org_of_ws(workspace_id)));
drop policy if exists wm_update on workspace_memberships;
create policy wm_update on workspace_memberships for update to authenticated
  using (seerist_is_org_admin(seerist_org_of_ws(workspace_id)))
  with check (seerist_is_org_admin(seerist_org_of_ws(workspace_id)));
drop policy if exists wm_delete on workspace_memberships;
create policy wm_delete on workspace_memberships for delete to authenticated
  using (seerist_is_org_admin(seerist_org_of_ws(workspace_id)) or user_id = auth.uid());

-- policy_configs: read-only reference data for all signed-in users.
-- Writes happen only via the service role (manual curation), never the client.
drop policy if exists pc_select on policy_configs;
create policy pc_select on policy_configs for select to authenticated using (true);

-- Generic workspace-scoped policies for module tables
do $$
declare t text;
begin
  foreach t in array array[
    'platform_connections','job_postings','proposals','delivery_runs',
    'workspace_memories','growth_touchpoints','product_signups','ploybooks',
    'site_ingestion_jobs','deploy_sync_drafts'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format(
      'create policy %I on %I for all to authenticated using (seerist_is_ws_member(workspace_id)) with check (seerist_is_ws_member(workspace_id))',
      t || '_all', t
    );
  end loop;
end $$;

-- proposal_status_history: scoped through the proposal's workspace
drop policy if exists psh_all on proposal_status_history;
create policy psh_all on proposal_status_history for all to authenticated
  using (seerist_is_ws_member(seerist_ws_of_proposal(proposal_id)))
  with check (seerist_is_ws_member(seerist_ws_of_proposal(proposal_id)));

-- delivery_tasks: scoped through the run's workspace
drop policy if exists dt_all on delivery_tasks;
create policy dt_all on delivery_tasks for all to authenticated
  using (seerist_is_ws_member(seerist_ws_of_run(delivery_run_id)))
  with check (seerist_is_ws_member(seerist_ws_of_run(delivery_run_id)));

-- persona_action_log: org members read; members write; org admins approve
drop policy if exists pal_select on persona_action_log;
create policy pal_select on persona_action_log for select to authenticated
  using (
    (organization_id is not null and seerist_is_org_member(organization_id))
    or (workspace_id is not null and seerist_is_ws_member(workspace_id))
  );
drop policy if exists pal_insert on persona_action_log;
create policy pal_insert on persona_action_log for insert to authenticated
  with check (
    (organization_id is not null and seerist_is_org_member(organization_id))
    or (workspace_id is not null and seerist_is_ws_member(workspace_id))
  );
drop policy if exists pal_update on persona_action_log;
create policy pal_update on persona_action_log for update to authenticated
  using (organization_id is not null and seerist_is_org_admin(organization_id))
  with check (organization_id is not null and seerist_is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Seed: manually curated per-platform mention policy (Upwork row).
-- Any platform WITHOUT a row defaults to 'no_mention' in drafting code.
-- ---------------------------------------------------------------------------

insert into policy_configs (platform, mention_policy, version, notes)
values ('upwork', 'description_only', 1,
        'Manually curated 2026-07-30: describe the product in prose; no external links in proposals. Re-review on any Upwork ToS change.')
on conflict (platform) do nothing;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Founder grants — emails listed here get lifetime free access. Every org
-- they create is forced to plan 'lifetime_founder' / billing_status 'active',
-- and NO update (including Creem webhooks or admin writes) can downgrade it.
-- ---------------------------------------------------------------------------

create table if not exists founder_grants (
  email text primary key,
  plan text not null default 'lifetime_founder',
  note text,
  created_at timestamptz not null default now()
);
alter table founder_grants enable row level security;
-- No client policies on purpose: invisible/immutable from the app.

insert into founder_grants (email, note)
values ('akshay@lyvena.xyz', 'Owner — full free access forever (granted 2026-07-30)')
on conflict (email) do nothing;

create or replace function seerist_apply_founder_grant()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  creator_email text;
begin
  if tg_op = 'UPDATE' then
    if old.plan = 'lifetime_founder' then
      new.plan := 'lifetime_founder';
      new.billing_status := 'active';
    end if;
    return new;
  end if;
  select email into creator_email from profiles where id = new.created_by;
  if creator_email is not null and exists (
    select 1 from founder_grants g where lower(g.email) = lower(creator_email)
  ) then
    new.plan := 'lifetime_founder';
    new.billing_status := 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_founder_grant_ins on organizations;
create trigger organizations_founder_grant_ins
  before insert on organizations
  for each row execute function seerist_apply_founder_grant();

drop trigger if exists organizations_founder_grant_upd on organizations;
create trigger organizations_founder_grant_upd
  before update on organizations
  for each row execute function seerist_apply_founder_grant();

notify pgrst, 'reload schema';

-- ===========================================================================
-- Hermes memory, Builder DAG orchestration, Grower feedback loop, Ploybooks
-- execution and the CEO approval queue. Appended as a self-contained,
-- idempotent block so re-applying schema.sql never disturbs the tables above.
-- ===========================================================================

-- Task → owning workspace, for task_dependencies RLS.
create or replace function public.seerist_ws_of_task(t uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select r.workspace_id
  from delivery_tasks dt
  join delivery_runs r on r.id = dt.delivery_run_id
  where dt.id = t;
$$;

-- ---------------------------------------------------------------------------
-- Hermes memory layer — structured (jsonb) per-workspace memory and the skill
-- library extracted from completed delivery runs. `workspace_memories` above
-- stays as the free-text notes store; these two are the structured layer the
-- Builder and the Drafter consult.
-- ---------------------------------------------------------------------------

create table if not exists hermes_memories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create table if not exists hermes_skills (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  skill_name text not null,
  skill_data jsonb not null default '{}'::jsonb,
  source_delivery_run_id uuid references delivery_runs(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Builder DAG orchestration — the task graph for a delivery run.
-- ---------------------------------------------------------------------------

create table if not exists task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references delivery_tasks(id) on delete cascade,
  depends_on_task_id uuid not null references delivery_tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

-- ---------------------------------------------------------------------------
-- Grower feedback loop — plain-language recommendations derived from which
-- bid segments actually converted into attributed signups.
-- ---------------------------------------------------------------------------

create table if not exists growth_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  recommendation text not null,
  priority integer not null default 3,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ploybooks execution engine. `ploybooks` already exists as a named-strategy
-- record; `steps` makes it executable without disturbing `strategy_config`.
-- ---------------------------------------------------------------------------

alter table ploybooks add column if not exists steps jsonb not null default '[]'::jsonb;

create table if not exists ploybook_runs (
  id uuid primary key default gen_random_uuid(),
  ploybook_id uuid not null references ploybooks(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  status text not null default 'running'
    check (status in ('running','completed','failed','cancelled')),
  current_step integer not null default 0,
  results jsonb not null default '[]'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid
);

-- ---------------------------------------------------------------------------
-- CEO approval queue — every requires_approval CEO action parks here until a
-- human approves it. Nothing in this table executes on its own.
-- ---------------------------------------------------------------------------

create table if not exists ceo_approval_queue (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  action_type text not null,
  action_payload jsonb not null default '{}'::jsonb,
  requested_by_persona text not null default 'The CEO',
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  approved_by_user_id uuid,
  approved_by_at timestamptz,
  result text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_hermes_memories_ws on hermes_memories(workspace_id);
create index if not exists idx_hermes_skills_ws on hermes_skills(workspace_id);
create index if not exists idx_hermes_skills_run on hermes_skills(source_delivery_run_id);
create index if not exists idx_task_deps_task on task_dependencies(task_id);
create index if not exists idx_task_deps_depends on task_dependencies(depends_on_task_id);
create index if not exists idx_growth_recs_ws on growth_recommendations(workspace_id, priority);
create index if not exists idx_ploybook_runs_pb on ploybook_runs(ploybook_id);
create index if not exists idx_ploybook_runs_ws on ploybook_runs(workspace_id);
create index if not exists idx_ceo_queue_org on ceo_approval_queue(org_id, status);

-- ---------------------------------------------------------------------------
-- updated_at trigger (hermes_memories is the only new table that mutates)
-- ---------------------------------------------------------------------------

drop trigger if exists hermes_memories_touch on hermes_memories;
create trigger hermes_memories_touch before update on hermes_memories
  for each row execute function system.update_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table hermes_memories enable row level security;
alter table hermes_skills enable row level security;
alter table task_dependencies enable row level security;
alter table growth_recommendations enable row level security;
alter table ploybook_runs enable row level security;
alter table ceo_approval_queue enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'hermes_memories','hermes_skills','growth_recommendations','ploybook_runs'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format(
      'create policy %I on %I for all to authenticated using (seerist_is_ws_member(workspace_id)) with check (seerist_is_ws_member(workspace_id))',
      t || '_all', t
    );
  end loop;
end $$;

-- task_dependencies: scoped through the task's run's workspace
drop policy if exists td_all on task_dependencies;
create policy td_all on task_dependencies for all to authenticated
  using (seerist_is_ws_member(seerist_ws_of_task(task_id)))
  with check (seerist_is_ws_member(seerist_ws_of_task(task_id)));

-- ceo_approval_queue: org members read; only org admins approve/reject.
drop policy if exists ceoq_select on ceo_approval_queue;
create policy ceoq_select on ceo_approval_queue for select to authenticated
  using (seerist_is_org_member(org_id));
drop policy if exists ceoq_insert on ceo_approval_queue;
create policy ceoq_insert on ceo_approval_queue for insert to authenticated
  with check (seerist_is_org_member(org_id));
drop policy if exists ceoq_update on ceo_approval_queue;
create policy ceoq_update on ceo_approval_queue for update to authenticated
  using (seerist_is_org_admin(org_id)) with check (seerist_is_org_admin(org_id));

notify pgrst, 'reload schema';

-- ===========================================================================
-- Full Growth Engine (site generation, ads, visitor intent) + multi-platform
-- Module A (JobSource activation flags, authorized submission, source_type).
-- Appended as a self-contained, idempotent block.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Spec §7: `growth_content_drafts` — site/ad drafts pending approval.
-- Everything the Growth Engine produces lands here as a DRAFT. Per spec §6
-- nothing is ever auto-published; `published` only records that a human shipped it.
-- ---------------------------------------------------------------------------

create table if not exists growth_content_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null default 'page'
    check (kind in ('page','ad_creative','fix','metadata')),
  title text not null,
  body text,
  meta jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  source text,
  status text not null default 'draft'
    check (status in ('draft','in_review','approved','published','dismissed')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- The reconstructed design system a site's generated pages must match.
-- ---------------------------------------------------------------------------

create table if not exists site_design_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_url text not null,
  palette jsonb not null default '{}'::jsonb,
  typography jsonb not null default '{}'::jsonb,
  components jsonb not null default '{}'::jsonb,
  voice text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_url)
);

-- Continuous performance / competitor monitoring runs.
create table if not exists site_monitor_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null default 'performance' check (kind in ('performance','competitor')),
  findings jsonb not null default '[]'::jsonb,
  drafts_created integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ad creative + campaign management. Attribution deliberately reuses
-- growth_touchpoints so ad-driven and bid-driven signups share ONE model
-- (spec §4 Module C).
-- ---------------------------------------------------------------------------

create table if not exists ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  platform text not null default 'meta',
  objective text,
  status text not null default 'draft'
    check (status in ('draft','active','paused','ended')),
  daily_budget numeric(12,2),
  targeting jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A touchpoint can now come from a bid, an ad, or the site. Bids keep their
-- proposal_id; ad/site touchpoints carry a campaign_id instead.
alter table growth_touchpoints alter column proposal_id drop not null;
alter table growth_touchpoints add column if not exists source text not null default 'bid';
alter table growth_touchpoints add column if not exists campaign_id uuid references ad_campaigns(id) on delete set null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'growth_touchpoints_source_check') then
    alter table growth_touchpoints
      add constraint growth_touchpoints_source_check check (source in ('bid','ad','site'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Spec §7: `visitor_intent_records` (with consent/jurisdiction metadata).
-- Spec §4/§6/§11: this category carries GDPR/CCPA obligations, so it is OFF by
-- default per workspace and records are only accepted once consent has been
-- recorded for that workspace's jurisdiction.
-- ---------------------------------------------------------------------------

alter table workspaces add column if not exists visitor_intent_enabled boolean not null default false;
alter table workspaces add column if not exists visitor_intent_jurisdiction text;
alter table workspaces add column if not exists visitor_intent_consent_at timestamptz;
alter table workspaces add column if not exists visitor_intent_policy_url text;

create table if not exists visitor_intent_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  visitor_key text not null,
  company text,
  intent_score integer check (intent_score between 0 and 100),
  intent_reasoning text,
  signals jsonb not null default '{}'::jsonb,
  consent_status text not null default 'unknown'
    check (consent_status in ('granted','denied','unknown')),
  jurisdiction text,
  consent_recorded_at timestamptz,
  synced_to_crm_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, visitor_key)
);

-- ---------------------------------------------------------------------------
-- Module A: per-platform activation flags. Both default FALSE and are only
-- writable by the service role — policy_configs has no client write policy.
-- `api_polling_enabled` activates that platform's ApiPollSource once its
-- developer key is approved; `authorized_submission` activates the
-- authorized-partnership submission path (spec §4, §12) and stays false until
-- Seerist has that explicit relationship with the platform.
-- ---------------------------------------------------------------------------

alter table policy_configs add column if not exists api_polling_enabled boolean not null default false;
alter table policy_configs add column if not exists authorized_submission boolean not null default false;

-- When a human last read this platform's live terms. Null means never reviewed,
-- which is exactly why the row must stay at 'no_mention'.
alter table policy_configs add column if not exists last_reviewed timestamptz;
update policy_configs
   set last_reviewed = '2026-07-30T00:00:00Z'
 where platform = 'upwork' and last_reviewed is null;

-- Spec §7: platform_connections.source_type (extension | api).
alter table platform_connections add column if not exists source_type text not null default 'extension';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'platform_connections_source_type_check') then
    alter table platform_connections
      add constraint platform_connections_source_type_check check (source_type in ('extension','api'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_gcd_ws on growth_content_drafts(workspace_id, status);
create index if not exists idx_sdp_ws on site_design_profiles(workspace_id);
create index if not exists idx_smr_ws on site_monitor_runs(workspace_id);
create index if not exists idx_ad_campaigns_ws on ad_campaigns(workspace_id);
create index if not exists idx_touchpoints_campaign on growth_touchpoints(campaign_id);
create index if not exists idx_vir_ws on visitor_intent_records(workspace_id, intent_score);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['growth_content_drafts','site_design_profiles','ad_campaigns'] loop
    execute format(
      'drop trigger if exists %I on %I; create trigger %I before update on %I for each row execute function system.update_updated_at();',
      t || '_touch', t, t || '_touch', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table growth_content_drafts enable row level security;
alter table site_design_profiles enable row level security;
alter table site_monitor_runs enable row level security;
alter table ad_campaigns enable row level security;
alter table visitor_intent_records enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'growth_content_drafts','site_design_profiles','site_monitor_runs',
    'ad_campaigns','visitor_intent_records'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format(
      'create policy %I on %I for all to authenticated using (seerist_is_ws_member(workspace_id)) with check (seerist_is_ws_member(workspace_id))',
      t || '_all', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Seed: per-platform mention policy for the remaining three platforms.
-- Spec §4/§11 — these are MANUALLY curated and never auto-detected. Any
-- platform whose current policy has not been read and confirmed by a human
-- stays at the safe default 'no_mention', which the drafting code already
-- honours. Update these rows after reading each platform's live ToS.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- Billing (Creem MoR) + model-gateway tiering.
--   free plans  → only ZERO-COST models from the gateway
--   paid plans  → the best model overall by default, user-overridable
-- Both are DATA-driven so "the best model" can change without a code deploy.
-- ===========================================================================

create table if not exists billing_plans (
  code text primary key,
  name text not null,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'USD',
  interval text not null default 'month' check (interval in ('month','year','none')),
  creem_product_id text,
  rank integer not null default 0,
  is_paid boolean not null default false,
  features jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Ordered preference list matched against the LIVE gateway catalog
-- (GET /api/ai/models). Highest rank wins; within a matching family the
-- newest/highest version is chosen automatically, so a future
-- claude-opus-6 supersedes claude-opus-5 with no change here at all.
create table if not exists model_preferences (
  id uuid primary key default gen_random_uuid(),
  tier text not null check (tier in ('free','paid')),
  pattern text not null,
  rank integer not null default 0,
  note text,
  active boolean not null default true,
  unique (tier, pattern)
);

create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  model text not null,
  tier text not null,
  function_slug text,
  created_at timestamptz not null default now()
);

alter table organizations add column if not exists preferred_model text;
alter table organizations add column if not exists creem_subscription_id text;
alter table organizations add column if not exists plan_interval text;
alter table organizations add column if not exists current_period_end timestamptz;

create index if not exists idx_ai_usage_org_month on ai_usage_log(organization_id, created_at);
create index if not exists idx_ai_usage_ws on ai_usage_log(workspace_id);

alter table billing_plans enable row level security;
alter table model_preferences enable row level security;
alter table ai_usage_log enable row level security;

-- Reference data: readable by any signed-in user, written only by the service
-- role (same pattern as policy_configs — no client write policy on purpose).
-- ---------------------------------------------------------------------------
-- Delivery stack provisioning (InsForge co-branded partnership).
--
-- When a won contract is delivered on the InsForge stack, Seerist provisions a
-- REAL InsForge project for the client through the partnership API, so The
-- Builder writes code against a live backend instead of a placeholder.
--
-- Deliberately NO api_key column: the project key is a live credential and is
-- fetched fresh from InsForge on demand (delivery-stack `credentials`), which
-- keeps it out of the database and out of any row a client could be shown.
-- ---------------------------------------------------------------------------

alter table delivery_runs add column if not exists stack_account_id text;
alter table delivery_runs add column if not exists stack_project_id text;
alter table delivery_runs add column if not exists stack_access_host text;
alter table delivery_runs add column if not exists stack_region text;
alter table delivery_runs add column if not exists stack_instance_type text;
alter table delivery_runs add column if not exists stack_owner_email text;
alter table delivery_runs add column if not exists stack_provisioned_at timestamptz;

create index if not exists idx_delivery_runs_stack_project on delivery_runs(stack_project_id);

-- Pricing is public information — readable signed out so a pricing page or a
-- logged-out checkout link can render the ladder.
drop policy if exists billing_plans_select on billing_plans;
create policy billing_plans_select on billing_plans for select to anon, authenticated using (true);
drop policy if exists model_preferences_select on model_preferences;
create policy model_preferences_select on model_preferences for select to authenticated using (true);

drop policy if exists ai_usage_select on ai_usage_log;
create policy ai_usage_select on ai_usage_log for select to authenticated
  using (
    (organization_id is not null and seerist_is_org_member(organization_id))
    or (workspace_id is not null and seerist_is_ws_member(workspace_id))
  );
drop policy if exists ai_usage_insert on ai_usage_log;
create policy ai_usage_insert on ai_usage_log for insert to authenticated
  with check (
    (organization_id is not null and seerist_is_org_member(organization_id))
    or (workspace_id is not null and seerist_is_ws_member(workspace_id))
  );

-- Plan ladder. Creem product ids are live products in the Seerist store;
-- the free tier has no product because nothing is charged.
insert into billing_plans (code, name, description, price_cents, interval, creem_product_id, rank, is_paid, features, limits) values
  ('free', 'Free', 'Try the whole bidding loop. Free models only.', 0, 'none', null, 0, false,
   '["1 workspace","Chrome extension capture on all 4 platforms","AI fit scoring + proposal drafting","Pitch Queue, Analytics, full audit trail","Free models from the gateway"]'::jsonb,
   -- max_model_input_price caps what a free plan may cost per M input tokens.
   -- 0 = genuinely zero-cost models only. Raise to 0.2 to allow very cheap
   -- models such as deepseek/deepseek-v4-flash ($0.14/M) on the free tier.
   '{"workspaces":1,"ai_actions_per_month":50,"delivery_engine":false,"growth_engine":false,"ceo_persona":false,"model_choice":false,"max_model_input_price":0}'::jsonb),
  ('starter', 'Starter', '1 workspace, Bid + Delivery engines, premium models.', 4900, 'month', 'prod_64FkTYg19BehXAxxZ3Rnvz', 1, true,
   '["Everything in Free","Premium models (Opus-class by default)","Delivery Engine with human QA gate","Hermes memory + skill library","Choose your own model"]'::jsonb,
   '{"workspaces":1,"ai_actions_per_month":750,"delivery_engine":true,"growth_engine":false,"ceo_persona":false,"model_choice":true}'::jsonb),
  ('builder', 'Builder', '3 workspaces, all engines including the full Growth Engine.', 14900, 'month', 'prod_1KbeN1XPs0TcPckX3RySlZ', 2, true,
   '["Everything in Starter","3 workspaces","Full Growth Engine — Site Studio, Ads, Visitor intent","Ploybooks execution engine","Composio integrations"]'::jsonb,
   '{"workspaces":3,"ai_actions_per_month":3000,"delivery_engine":true,"growth_engine":true,"ceo_persona":false,"model_choice":true}'::jsonb),
  ('scale', 'Scale', '10 workspaces, the CEO persona, and API polling when approved.', 39900, 'month', 'prod_5z8aZK2jL7iNxeYGdluJl9', 3, true,
   '["Everything in Builder","10 workspaces","The CEO persona with its approval queue","API polling per platform as access is approved","Priority support"]'::jsonb,
   '{"workspaces":10,"ai_actions_per_month":12000,"delivery_engine":true,"growth_engine":true,"ceo_persona":true,"model_choice":true}'::jsonb),
  ('starter_annual', 'Starter (annual)', 'Starter billed yearly — 2 months free.', 49000, 'year', 'prod_42NNzZ5QMttfLm6owbUztY', 1, true,
   '["Everything in Starter","2 months free vs monthly"]'::jsonb,
   '{"workspaces":1,"ai_actions_per_month":750,"delivery_engine":true,"growth_engine":false,"ceo_persona":false,"model_choice":true}'::jsonb),
  ('builder_annual', 'Builder (annual)', 'Builder billed yearly — 2 months free.', 149000, 'year', 'prod_3kIuVm748zlejuW4m4iltY', 2, true,
   '["Everything in Builder","2 months free vs monthly"]'::jsonb,
   '{"workspaces":3,"ai_actions_per_month":3000,"delivery_engine":true,"growth_engine":true,"ceo_persona":false,"model_choice":true}'::jsonb),
  ('scale_annual', 'Scale (annual)', 'Scale billed yearly — 2 months free.', 399000, 'year', 'prod_6pgwtkJgYGEINzwWoODcG2', 3, true,
   '["Everything in Scale","2 months free vs monthly"]'::jsonb,
   '{"workspaces":10,"ai_actions_per_month":12000,"delivery_engine":true,"growth_engine":true,"ceo_persona":true,"model_choice":true}'::jsonb)
on conflict (code) do update set
  name = excluded.name, description = excluded.description, price_cents = excluded.price_cents,
  interval = excluded.interval, creem_product_id = excluded.creem_product_id, rank = excluded.rank,
  is_paid = excluded.is_paid, features = excluded.features, limits = excluded.limits, updated_at = now();

-- FREE tier: only zero-cost gateway models are ever eligible (the resolver
-- enforces price = 0 as a hard constraint; these patterns only order them).
insert into model_preferences (tier, pattern, rank, note) values
-- FREE tier: ranked by how well a model serves an interactive request, not by
-- size. Edge functions are killed at ~30s, so a larger model that needs 47s to
-- answer is not a better free default -- it is a timeout. Ranks below follow
-- measured latency on Seerist's own drafting and decomposition prompts.
  ('free', 'inclusionai/ling',         100, 'Zero-cost and fast (~4s on a drafting prompt) — comfortably inside the request budget.'),
  ('free', 'nvidia/nemotron-3-super',   90, 'Strong zero-cost mid-size, ~13s.'),
  ('free', 'nvidia/nemotron-3-nano',    80, 'Zero-cost small, ~27s on long outputs.'),
  ('free', 'nvidia/nemotron-3-ultra',   70, 'Most capable zero-cost model, but ~47s on long outputs — often past the edge timeout.'),
  ('free', 'nvidia/nemotron-nano',      60, 'Small zero-cost fallback.'),
  ('free', 'google/gemma',              50, 'Zero-cost Gemma family.'),
  ('free', 'openai/gpt-oss',            40, 'Last resort — measured ~50s on a drafting prompt.'),
-- PAID tier: best overall first. Version numbers are compared automatically,
-- so a future claude-opus-6 wins over opus-5 without touching this table.
  ('paid', 'anthropic/claude-opus',    100, 'Best overall. Default for paid plans.'),
  ('paid', 'anthropic/claude-sonnet',   90, 'Faster, cheaper Anthropic fallback.'),
  ('paid', 'openai/gpt-5',              80, 'OpenAI flagship fallback.'),
  ('paid', 'google/gemini-3',           70, 'Google flagship fallback.'),
  ('paid', 'deepseek/deepseek-v4',      60, 'High value-for-money fallback.')
on conflict (tier, pattern) do update set rank = excluded.rank, note = excluded.note, active = true;

insert into policy_configs (platform, mention_policy, version, notes) values
  ('fiverr', 'no_mention', 1,
   'PLACEHOLDER — safe default. Fiverr''s off-platform contact/solicitation rules are strict; read the current ToS and update this row before allowing any product mention.'),
  ('freelancer', 'no_mention', 1,
   'PLACEHOLDER — safe default. Read Freelancer.com''s current external-link and solicitation policy and update this row before allowing any product mention.'),
  ('toptal', 'no_mention', 1,
   'PLACEHOLDER — safe default. Read Toptal''s current engagement policy and update this row before allowing any product mention.')
on conflict (platform) do nothing;


-- ============================================================================
-- Discovery, learning and automation (2026-08-01)
--
-- Three gaps this closes: Seerist could not see a job until a human had already
-- found it; it never learned from whether a bid won; and nothing ran unless
-- somebody clicked. Everything below is additive -- no existing column,
-- constraint or policy is removed.
-- ============================================================================

-- --- Discovery --------------------------------------------------------------

-- A job can now arrive from a forwarded platform alert email. Same pipeline,
-- one more source value.
alter table job_postings drop constraint if exists job_postings_source_check;
alter table job_postings add constraint job_postings_source_check
  check (source in ('extension_capture','api_poll','manual','email_alert'));

-- Per-workspace intake address (jobs+<token>@...). Random and revocable, and
-- the ONLY thing that maps an inbound email to a workspace -- a From address is
-- trivially forged, so it is never trusted on its own.
alter table workspaces add column if not exists intake_token text;
-- A default, not just a backfill: a workspace created tomorrow needs an intake
-- address as much as one created today.
alter table workspaces alter column intake_token set default encode(gen_random_bytes(9), 'hex');
create unique index if not exists workspaces_intake_token_key on workspaces (intake_token);
update workspaces set intake_token = encode(gen_random_bytes(9), 'hex') where intake_token is null;

-- The same job forwarded twice (two alert emails, or an email plus a manual
-- capture) must not become two proposals.
create unique index if not exists job_postings_workspace_url_key
  on job_postings (workspace_id, url) where url is not null;

-- --- Automation preferences (per workspace, always switch-off-able) ----------

alter table workspaces add column if not exists automation_enabled boolean not null default true;
alter table workspaces add column if not exists alert_min_score integer not null default 75;
alter table workspaces add column if not exists alert_channel text;
alter table workspaces add column if not exists alert_target text;

-- --- Learning from outcomes -------------------------------------------------

-- Why a bid was won or lost. Without this there is nothing to learn from: the
-- outcome enum records THAT we lost, never why.
alter table proposals add column if not exists outcome_reason text;
alter table proposals add column if not exists outcome_category text;
alter table proposals drop constraint if exists proposals_outcome_category_check;
alter table proposals add constraint proposals_outcome_category_check
  check (outcome_category is null or outcome_category in
    ('price','timing','fit','scope','competitor','no_response','client_silent','other'));

-- Automation bookkeeping, so a nudge is sent once and a re-score is not redone
-- every night for a job nothing has changed about.
alter table proposals add column if not exists follow_up_nudged_at timestamptz;
alter table proposals add column if not exists rescored_at timestamptz;

create index if not exists proposals_outcome_idx on proposals (workspace_id, outcome);

-- --- Scheduled work ---------------------------------------------------------

-- One row per automation tick. A scheduled job that silently stops running is
-- worse than no scheduled job, so every run is recorded whether it did work
-- or not.
create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  job text not null,
  status text not null default 'ok' check (status in ('ok','skipped','failed')),
  detail text,
  items integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists automation_runs_ws_idx on automation_runs (workspace_id, created_at desc);

alter table automation_runs enable row level security;
drop policy if exists automation_runs_select on automation_runs;
create policy automation_runs_select on automation_runs for select to authenticated
  using (workspace_id is not null and seerist_is_ws_member(workspace_id));

notify pgrst, 'reload schema';
