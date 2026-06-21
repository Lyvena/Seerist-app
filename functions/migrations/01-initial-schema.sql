-- Seerist Database Schema
-- Run this via InsForge CLI: insforge db migrate

-- Products table
create table products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  description text not null,
  url text,
  category text,
  target_customer text,
  key_benefits text[] default '{}',
  pricing_model text,
  price_point text,
  keywords text[] default '{}',
  anti_keywords text[] default '{}',
  tone_preferences jsonb,
  platforms_to_monitor text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Platforms table
create table platforms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  is_supported boolean default true,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Opportunities table
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  product_id uuid references products,
  platform_id uuid references platforms,
  external_id text not null,
  title text not null,
  description text,
  poster_name text,
  poster_company text,
  post_url text not null,
  budget_min integer,
  budget_max integer,
  budget_currency text default 'USD',
  budget_type text default 'unknown',
  required_skills text[] default '{}',
  ai_score integer check (ai_score >= 0 and ai_score <= 100),
  ai_score_breakdown jsonb,
  posted_at timestamptz,
  status text check (status in ('new', 'viewed', 'proposing', 'proposed', 'won', 'lost', 'skipped')) default 'new',
  is_starred boolean default false,
  raw_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, external_id, platform_id)
);

-- Create index for faster score queries
create index opportunities_user_score_idx on opportunities(user_id, ai_score desc);

-- Proposals table
create table proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  product_id uuid references products,
  opportunity_id uuid references opportunities,
  content text not null,
  tone_used text check (tone_used in ('professional', 'casual', 'enthusiastic', 'concise')),
  word_count integer,
  status text check (status in ('draft', 'sent', 'accepted', 'rejected')) default 'draft',
  sent_at timestamptz,
  response_received_at timestamptz,
  outcome text check (outcome in ('accepted', 'rejected', 'no_response')),
  rating integer check (rating >= 1 and rating <= 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pipeline entries (kanban board state)
create table pipeline_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  opportunity_id uuid references opportunities not null,
  stage text check (stage in ('new', 'qualified', 'proposing', 'negotiating', 'won', 'lost')) not null,
  stage_changed_at timestamptz,
  deal_value integer,
  deal_currency text default 'USD',
  close_probability integer check (close_probability >= 0 and close_probability <= 100),
  expected_close_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, opportunity_id)
);

-- Profiles table (per-user settings)
create table profiles (
  id uuid primary key references auth.users,
  user_id uuid unique references auth.users,
  plan text check (plan in ('free', 'pro', 'agency')) default 'free',
  ai_api_key text,
  ai_model text default 'openai/gpt-4o-mini',
  ai_tone text check (ai_tone in ('professional', 'casual', 'enthusiastic', 'concise')) default 'professional',
  ai_max_proposal_words integer default 250,
  ai_include_pricing boolean default false,
  ai_include_product_url boolean default false,
  ai_prioritize_relevance boolean default true,
  ai_keyword_penalty text check (ai_keyword_penalty in ('none', 'light', 'strict')) default 'light',
  ai_boost_repeat_posters boolean default false,
  notification_email boolean default true,
  notification_slack text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notifications table
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text check (type in ('opportunity', 'proposal', 'subscription', 'alert')) not null,
  title text not null,
  body text,
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index notifications_user_read_idx on notifications(user_id, is_read);

-- Activity log table
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  entity_type text check (entity_type in ('product', 'opportunity', 'proposal', 'platform')) not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- RLS Policies

-- Products: users can only access their own products
create policy "products_user_access" on products
  for all using (auth.uid() = user_id);

-- Opportunities: users can only access their own opportunities
create policy "opportunities_user_access" on opportunities
  for all using (auth.uid() = user_id);

-- Proposals: users can only access their own proposals
create policy "proposals_user_access" on proposals
  for all using (auth.uid() = user_id);

-- Pipeline entries: users can only access their own entries
create policy "pipeline_user_access" on pipeline_entries
  for all using (auth.uid() = user_id);

-- Profile: users can only access their own profile
create policy "profile_user_access" on profiles
  for all using (auth.uid() = id);

-- Notifications: users can only access their own notifications
create policy "notifications_user_access" on notifications
  for all using (auth.uid() = user_id);

-- Platforms: read all supported platforms, full access for user-specific
create policy "platforms_read" on platforms
  for select using (true);
create policy "platforms_user_access" on platforms
  for all using (auth.uid() = user_id);

-- Activity log: users can only access their own logs
create policy "activity_log_user_access" on activity_log
  for all using (auth.uid() = user_id);

-- Insert policies to allow inserts for authenticated users
create policy "products_insert" on products for insert with check (auth.uid() = user_id);
create policy "opportunities_insert" on opportunities for insert with check (auth.uid() = user_id);
create policy "proposals_insert" on proposals for insert with check (auth.uid() = user_id);
create policy "pipeline_insert" on pipeline_entries for insert with check (auth.uid() = user_id);
create policy "notifications_insert" on notifications for insert with check (auth.uid() = user_id);
create policy "activity_log_insert" on activity_log for insert with check (auth.uid() = user_id);