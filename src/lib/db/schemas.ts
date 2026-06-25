import { z } from "zod"

// ───────────────────────────────────────────────────────────────────────────
// Schemas aligned to the LIVE InsForge database (source of truth).
// Keep these in sync with migrations/. The DB CHECK constraints are the
// authoritative allowed values for enum-like text columns.
// ───────────────────────────────────────────────────────────────────────────

// Pipeline stages (pipeline_entries.stage)
export const PIPELINE_STAGES = [
  "discovered",
  "reviewed",
  "proposal_drafted",
  "proposal_sent",
  "in_negotiation",
  "closed_won",
  "closed_lost",
] as const
export type PipelineStage = (typeof PIPELINE_STAGES)[number]

// Opportunity statuses (opportunities.status)
export const OPPORTUNITY_STATUSES = [
  "new",
  "viewed",
  "proposing",
  "proposed",
  "negotiating",
  "won",
  "lost",
  "skipped",
  "archived",
] as const
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number]

// Activity log entity types (activity_log.entity_type)
export const ENTITY_TYPES = ["opportunity", "proposal", "pipeline"] as const

// Alert digest frequencies (alert_preferences.digest_frequency)
export const DIGEST_FREQUENCIES = ["realtime", "hourly", "daily", "weekly", "never"] as const

// Plans (profiles.plan / subscriptions.plan)
export const PLANS = ["free", "pro", "agency"] as const
export type Plan = (typeof PLANS)[number]

// Proposal tones (proposals.tone)
export const TONES = ["professional", "casual", "enthusiastic", "concise"] as const
export type Tone = (typeof TONES)[number]

// ─── Product ───────────────────────────────────────────────────────────────
export const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(2000),
  url: z.string().url().nullable().or(z.literal("")),
  category: z.string().nullable(),
  target_customer: z.string().nullable(),
  key_benefits: z.array(z.string()).default([]),
  pricing_model: z.string().nullable(),
  price_point: z.string().nullable(),
  keywords: z.array(z.string()).default([]),
  anti_keywords: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type Product = z.infer<typeof ProductSchema>

// ─── Opportunity ───────────────────────────────────────────────────────────
export const OpportunitySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  product_id: z.string().uuid().nullable(),
  platform_id: z.string().uuid(),
  external_id: z.string(),
  title: z.string().min(1).max(300),
  description: z.string(),
  poster_name: z.string().nullable(),
  poster_company: z.string().nullable(),
  poster_url: z.string().nullable(),
  post_url: z.string(),
  budget_min: z.number().nullable(),
  budget_max: z.number().nullable(),
  budget_currency: z.string().default("USD"),
  budget_type: z.enum(["fixed", "hourly", "monthly", "unknown"]).default("unknown"),
  required_skills: z.array(z.string()).default([]),
  location: z.string().nullable(),
  is_remote: z.boolean().default(true),
  posted_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  ai_score: z.number().int().min(0).max(100).nullable(),
  ai_score_reason: z.string().nullable(),
  ai_score_breakdown: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(OPPORTUNITY_STATUSES).default("new"),
  is_starred: z.boolean().default(false),
  notes: z.string().nullable(),
  raw_data: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type Opportunity = z.infer<typeof OpportunitySchema>

// ─── Proposal ──────────────────────────────────────────────────────────────
export const ProposalSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  opportunity_id: z.string().uuid(),
  product_id: z.string().uuid().nullable(),
  content: z.string(),
  version: z.number().int().default(1),
  tone: z.enum(TONES).default("professional"),
  word_count: z.number().int().nullable(),
  is_ai_generated: z.boolean().default(true),
  model_used: z.string().nullable(),
  generation_prompt: z.string().nullable(),
  tokens_used: z.number().int().nullable(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).default("draft"),
  sent_at: z.string().nullable(),
  response_received_at: z.string().nullable(),
  outcome: z.enum(["accepted", "rejected", "no_response", "withdrawn"]).nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type Proposal = z.infer<typeof ProposalSchema>

// ─── Pipeline entry ────────────────────────────────────────────────────────
export const PipelineEntrySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  opportunity_id: z.string().uuid(),
  stage: z.enum(PIPELINE_STAGES),
  stage_changed_at: z.string().nullable(),
  deal_value: z.number().nullable(),
  deal_currency: z.string().default("USD"),
  close_probability: z.number().int().min(0).max(100).nullable(),
  expected_close_date: z.string().nullable(),
  lost_reason: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type PipelineEntry = z.infer<typeof PipelineEntrySchema>

// ─── Platform (public, shared catalog — no user_id) ────────────────────────
export const PlatformSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string(),
  name: z.string(),
  base_url: z.string().nullable(),
  logo_url: z.string().url().nullable().or(z.literal("")),
  category: z.string().nullable(),
  is_supported: z.boolean().default(true),
  scrape_interval_minutes: z.number().int().default(60),
  created_at: z.string().optional(),
})
export type Platform = z.infer<typeof PlatformSchema>

// ─── User platform config (per-user enablement) ────────────────────────────
export const UserPlatformConfigSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  platform_id: z.string().uuid(),
  is_enabled: z.boolean().default(true),
  custom_keywords: z.array(z.string()).default([]),
  min_score: z.number().int().min(0).max(100).default(60),
  auto_propose: z.boolean().default(false),
  notify_email: z.boolean().default(true),
  created_at: z.string().optional(),
})
export type UserPlatformConfig = z.infer<typeof UserPlatformConfigSchema>

// ─── Profile (per-user settings; id == auth.users.id) ──────────────────────
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  company_name: z.string().nullable(),
  website: z.string().nullable(),
  timezone: z.string().default("UTC"),
  onboarding_completed: z.boolean().default(false),
  plan: z.enum(PLANS).default("free"),
  ai_api_key: z.string().nullable(),
  ai_model: z.string().default("openai/gpt-4o-mini"),
  ai_tone: z.enum(TONES).default("professional"),
  ai_max_proposal_words: z.number().int().default(250),
  ai_include_pricing: z.boolean().default(false),
  ai_include_product_url: z.boolean().default(false),
  ai_prioritize_relevance: z.boolean().default(true),
  ai_keyword_penalty: z.enum(["none", "light", "strict"]).default("light"),
  ai_boost_repeat_posters: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type Profile = z.infer<typeof ProfileSchema>

// ─── Notification ──────────────────────────────────────────────────────────
export const NotificationSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  link: z.string().nullable(),
  is_read: z.boolean().default(false),
  created_at: z.string().optional(),
})
export type Notification = z.infer<typeof NotificationSchema>

// ─── Alert preferences ─────────────────────────────────────────────────────
export const AlertPreferenceSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  digest_frequency: z.enum(DIGEST_FREQUENCIES).default("daily"),
  min_score_for_alert: z.number().int().min(0).max(100).default(70),
  platforms_included: z.array(z.string()).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type AlertPreference = z.infer<typeof AlertPreferenceSchema>

// ─── Subscription ──────────────────────────────────────────────────────────
export const SubscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  plan: z.enum(PLANS).default("free"),
  status: z.enum(["active", "past_due", "cancelled", "trialing"]).default("active"),
  payment_provider_id: z.string().nullable(),
  current_period_start: z.string().nullable(),
  current_period_end: z.string().nullable(),
  cancel_at_period_end: z.boolean().default(false),
  monthly_opportunity_quota: z.number().int().default(100),
  monthly_proposal_quota: z.number().int().default(20),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type Subscription = z.infer<typeof SubscriptionSchema>

// ─── Activity log ──────────────────────────────────────────────────────────
export const ActivityLogSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.string(),
  action: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().optional(),
})
export type ActivityLog = z.infer<typeof ActivityLogSchema>

// ─── Input schemas for creates ─────────────────────────────────────────────
export const CreateProductInput = ProductSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})
export type CreateProductInput = z.infer<typeof CreateProductInput>

export const CreateProposalInput = ProposalSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  status: true,
})
export type CreateProposalInput = z.infer<typeof CreateProposalInput>

export const UpdatePipelineInput = PipelineEntrySchema.pick({
  stage: true,
  notes: true,
  deal_value: true,
  close_probability: true,
  expected_close_date: true,
})
export type UpdatePipelineInput = z.infer<typeof UpdatePipelineInput>
