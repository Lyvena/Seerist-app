-- Database Export
-- Generated on: 2026-06-25T04:48:06.066Z
-- Format: SQL
-- Include Data: false
-- Row Limit: 1000 rows per table

-- Table: activity_log
CREATE TABLE IF NOT EXISTS activity_log (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, entity_type text NOT NULL, entity_id uuid NOT NULL, action text NOT NULL, metadata jsonb, created_at timestamptz DEFAULT now());

-- Indexes for table: activity_log
CREATE INDEX idx_activity_entity ON public.activity_log USING btree (entity_id);
CREATE INDEX idx_activity_user ON public.activity_log USING btree (user_id);

-- Foreign key constraints for table: activity_log
ALTER TABLE activity_log ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

-- RLS enabled for table: activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: activity_log
CREATE POLICY "Users can access own data" ON activity_log FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- Table: alert_preferences
CREATE TABLE IF NOT EXISTS alert_preferences (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, digest_frequency text DEFAULT 'daily'::text, min_score_for_alert integer DEFAULT 70, platforms_included ARRAY, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Indexes for table: alert_preferences
CREATE UNIQUE INDEX alert_preferences_user_id_key ON public.alert_preferences USING btree (user_id);

-- Foreign key constraints for table: alert_preferences
ALTER TABLE alert_preferences ADD CONSTRAINT alert_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

-- RLS enabled for table: alert_preferences
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: alert_preferences
CREATE POLICY "Users can access own data" ON alert_preferences FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, type text NOT NULL, title text NOT NULL, body text, link text, is_read boolean DEFAULT false, created_at timestamptz DEFAULT now());

-- Indexes for table: notifications
CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

-- Foreign key constraints for table: notifications
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

-- RLS enabled for table: notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: notifications
CREATE POLICY "Users see own notifications" ON notifications FOR ALL TO authenticated USING ((user_id = auth.uid()));

-- Table: opportunities
CREATE TABLE IF NOT EXISTS opportunities (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, product_id uuid, platform_id uuid NOT NULL, external_id text, title text NOT NULL, description text NOT NULL, poster_name text, poster_company text, poster_url text, post_url text NOT NULL, budget_min numeric, budget_max numeric, budget_currency text DEFAULT 'USD'::text, budget_type text, required_skills ARRAY, location text, is_remote boolean DEFAULT true, posted_at timestamptz, expires_at timestamptz, ai_score integer, ai_score_reason text, ai_score_breakdown jsonb, embedding USER-DEFINED, status text DEFAULT 'new'::text, is_starred boolean DEFAULT false, notes text, raw_data jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Indexes for table: opportunities
CREATE INDEX idx_opportunities_embedding ON public.opportunities USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
CREATE INDEX idx_opportunities_platform ON public.opportunities USING btree (platform_id);
CREATE INDEX idx_opportunities_posted_at ON public.opportunities USING btree (posted_at DESC);
CREATE INDEX idx_opportunities_score ON public.opportunities USING btree (ai_score DESC);
CREATE INDEX idx_opportunities_status ON public.opportunities USING btree (status);
CREATE INDEX idx_opportunities_user_id ON public.opportunities USING btree (user_id);
CREATE UNIQUE INDEX opportunities_user_id_platform_id_external_id_key ON public.opportunities USING btree (user_id, platform_id, external_id);

-- Foreign key constraints for table: opportunities
ALTER TABLE opportunities ADD CONSTRAINT opportunities_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES platforms (id);
ALTER TABLE opportunities ADD CONSTRAINT opportunities_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

-- RLS enabled for table: opportunities
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: opportunities
CREATE POLICY "Users can access own data" ON opportunities FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- Table: pending_alerts
CREATE TABLE IF NOT EXISTS pending_alerts (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, opportunity_external_id text NOT NULL, score integer NOT NULL, platform_slug text NOT NULL, title text NOT NULL, created_at timestamptz DEFAULT now());

-- Indexes for table: pending_alerts
CREATE INDEX idx_pending_alerts_user_id ON public.pending_alerts USING btree (user_id);

-- Foreign key constraints for table: pending_alerts
ALTER TABLE pending_alerts ADD CONSTRAINT pending_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

-- RLS enabled for table: pending_alerts
ALTER TABLE pending_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: pending_alerts
CREATE POLICY "System manages pending_alerts" ON pending_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Table: pipeline_entries
CREATE TABLE IF NOT EXISTS pipeline_entries (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, opportunity_id uuid NOT NULL, stage text NOT NULL, stage_changed_at timestamptz DEFAULT now(), deal_value numeric, deal_currency text DEFAULT 'USD'::text, close_probability integer, expected_close_date date, lost_reason text, notes text, created_at timestamptz DEFAULT now());

-- Indexes for table: pipeline_entries
CREATE INDEX idx_pipeline_opportunity ON public.pipeline_entries USING btree (opportunity_id);

-- Foreign key constraints for table: pipeline_entries
ALTER TABLE pipeline_entries ADD CONSTRAINT pipeline_entries_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE;
ALTER TABLE pipeline_entries ADD CONSTRAINT pipeline_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

-- RLS enabled for table: pipeline_entries
ALTER TABLE pipeline_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: pipeline_entries
CREATE POLICY "Users can access own data" ON pipeline_entries FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- Table: platforms
CREATE TABLE IF NOT EXISTS platforms (id uuid NOT NULL DEFAULT gen_random_uuid(), slug text NOT NULL, name text NOT NULL, base_url text NOT NULL, logo_url text, category text, is_supported boolean DEFAULT true, scrape_interval_minutes integer DEFAULT 60, created_at timestamptz DEFAULT now());

-- Indexes for table: platforms
CREATE UNIQUE INDEX platforms_slug_key ON public.platforms USING btree (slug);

-- RLS enabled for table: platforms
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: platforms
CREATE POLICY "Platforms are publicly readable" ON platforms FOR SELECT TO authenticated USING (true);

-- Table: products
CREATE TABLE IF NOT EXISTS products (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL, description text NOT NULL, url text, category text, target_customer text, key_benefits ARRAY, pricing_model text, price_point text, keywords ARRAY, anti_keywords ARRAY, embedding USER-DEFINED, is_active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Indexes for table: products
CREATE INDEX idx_products_embedding ON public.products USING ivfflat (embedding vector_cosine_ops) WITH (lists='50');
CREATE INDEX idx_products_user_id ON public.products USING btree (user_id);

-- Foreign key constraints for table: products
ALTER TABLE products ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

-- RLS enabled for table: products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: products
CREATE POLICY "Users can access own data" ON products FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- Table: profiles
CREATE TABLE IF NOT EXISTS profiles (id uuid NOT NULL, full_name text, avatar_url text, company_name text, website text, timezone text DEFAULT 'UTC'::text, onboarding_completed boolean DEFAULT false, plan text DEFAULT 'free'::text, ai_api_key text, ai_model text DEFAULT 'openai/gpt-4o-mini'::text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), ai_tone text DEFAULT 'professional'::text, ai_max_proposal_words integer DEFAULT 250, ai_include_pricing boolean DEFAULT false, ai_include_product_url boolean DEFAULT false, ai_prioritize_relevance boolean DEFAULT true, ai_keyword_penalty text DEFAULT 'light'::text, ai_boost_repeat_posters boolean DEFAULT false);

-- RLS enabled for table: profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: profiles
CREATE POLICY "Users can access own data" ON profiles FOR ALL TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));

-- Table: proposals
CREATE TABLE IF NOT EXISTS proposals (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, opportunity_id uuid NOT NULL, product_id uuid, content text NOT NULL, version integer DEFAULT 1, tone text DEFAULT 'professional'::text, word_count integer, is_ai_generated boolean DEFAULT true, model_used text, generation_prompt text, tokens_used integer, sent_at timestamptz, response_received_at timestamptz, outcome text, rating integer, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Indexes for table: proposals
CREATE INDEX idx_proposals_opportunity ON public.proposals USING btree (opportunity_id);

-- Foreign key constraints for table: proposals
ALTER TABLE proposals ADD CONSTRAINT proposals_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE;
ALTER TABLE proposals ADD CONSTRAINT proposals_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL;
ALTER TABLE proposals ADD CONSTRAINT proposals_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

-- RLS enabled for table: proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: proposals
CREATE POLICY "Users can access own data" ON proposals FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- Table: subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, plan text NOT NULL DEFAULT 'free'::text, status text DEFAULT 'active'::text, payment_provider_id text, current_period_start timestamptz, current_period_end timestamptz, cancel_at_period_end boolean DEFAULT false, monthly_opportunity_quota integer DEFAULT 100, monthly_proposal_quota integer DEFAULT 20, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- Indexes for table: subscriptions
CREATE UNIQUE INDEX subscriptions_user_id_key ON public.subscriptions USING btree (user_id);

-- Foreign key constraints for table: subscriptions
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

-- RLS enabled for table: subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: subscriptions
CREATE POLICY "Users can access own data" ON subscriptions FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- Table: user_platform_configs
CREATE TABLE IF NOT EXISTS user_platform_configs (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, platform_id uuid NOT NULL, is_enabled boolean DEFAULT true, custom_keywords ARRAY, min_score integer DEFAULT 60, auto_propose boolean DEFAULT false, notify_email boolean DEFAULT true, created_at timestamptz DEFAULT now());

-- Indexes for table: user_platform_configs
CREATE UNIQUE INDEX user_platform_configs_user_id_platform_id_key ON public.user_platform_configs USING btree (user_id, platform_id);

-- Foreign key constraints for table: user_platform_configs
ALTER TABLE user_platform_configs ADD CONSTRAINT user_platform_configs_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES platforms (id);
ALTER TABLE user_platform_configs ADD CONSTRAINT user_platform_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

-- RLS enabled for table: user_platform_configs
ALTER TABLE user_platform_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies for table: user_platform_configs
CREATE POLICY "Users can access own data" ON user_platform_configs FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- Functions and Procedures
-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.metadata->>'full_name',
    NEW.metadata->>'avatar_url'
  );
  INSERT INTO public.subscriptions (user_id, plan)
  VALUES (NEW.id, 'free');
  INSERT INTO public.alert_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$
;


