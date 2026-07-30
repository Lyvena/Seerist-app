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
drop policy if exists orgs_select on organizations;
create policy orgs_select on organizations for select to authenticated
  using (seerist_is_org_member(id));
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
drop policy if exists om_select on organization_memberships;
create policy om_select on organization_memberships for select to authenticated
  using (seerist_is_org_member(organization_id));
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
  using (seerist_is_org_member(seerist_org_of_ws(workspace_id)));
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
