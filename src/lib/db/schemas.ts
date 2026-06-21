import { z } from "zod"

// Product entity
export const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(2000),
  url: z.string().url().nullable(),
  category: z.string().nullable(),
  target_customer: z.string().nullable(),
  key_benefits: z.array(z.string()),
  pricing_model: z.string().nullable(),
  price_point: z.string().nullable(),
  keywords: z.array(z.string()),
  anti_keywords: z.array(z.string()),
  tone_preferences: z.object({
    professional: z.boolean().optional(),
    casual: z.boolean().optional(),
    enthusiastic: z.boolean().optional(),
    concise: z.boolean().optional(),
  }).optional(),
  platforms_to_monitor: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type Product = z.infer<typeof ProductSchema>

// Opportunity entity
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
  post_url: z.string().url(),
  budget_min: z.number().int().nullable(),
  budget_max: z.number().int().nullable(),
  budget_currency: z.string().default("USD"),
  budget_type: z.enum(["fixed", "hourly", "monthly", "unknown"]).default("unknown"),
  required_skills: z.array(z.string()),
  ai_score: z.number().int().min(0).max(100).nullable(),
  ai_score_breakdown: z.record(z.string(), z.number()).nullable(),
  posted_at: z.string().nullable(),
  status: z.enum(["new", "viewed", "proposing", "proposed", "won", "lost", "skipped"]).default("new"),
  is_starred: z.boolean().default(false),
  raw_data: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type Opportunity = z.infer<typeof OpportunitySchema>

// Proposal entity
export const ProposalSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  product_id: z.string().uuid().nullable(),
  opportunity_id: z.string().uuid(),
  content: z.string(),
  tone_used: z.enum(["professional", "casual", "enthusiastic", "concise"]),
  word_count: z.number().int().nullable(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).default("draft"),
  sent_at: z.string().nullable(),
  response_received_at: z.string().nullable(),
  outcome: z.enum(["accepted", "rejected", "no_response"]).nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type Proposal = z.infer<typeof ProposalSchema>

// Pipeline entry (board positioning + metadata)
export const PipelineEntrySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  opportunity_id: z.string().uuid(),
  stage: z.enum(["new", "qualified", "proposing", "negotiating", "won", "lost"]),
  stage_changed_at: z.string().nullable(),
  deal_value: z.number().int().nullable(),
  deal_currency: z.string().default("USD"),
  close_probability: z.number().int().min(0).max(100).nullable(),
  expected_close_date: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type PipelineEntry = z.infer<typeof PipelineEntrySchema>

// Platform entity
export const PlatformSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string(),
  name: z.string(),
  logo_url: z.string().url().nullable(),
  is_supported: z.boolean().default(true),
  is_active: z.boolean().default(false),
  user_id: z.string().uuid().nullable(),
  last_sync_at: z.string().nullable(),
  created_at: z.string().optional(),
})

export type Platform = z.infer<typeof PlatformSchema>

// Profile entity (per-user settings)
export const ProfileSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  plan: z.enum(["free", "pro", "agency"]).default("free"),
  ai_api_key: z.string().nullable(),
  ai_model: z.string().default("openai/gpt-4o-mini"),
  ai_tone: z.enum(["professional", "casual", "enthusiastic", "concise"]).default("professional"),
  ai_max_proposal_words: z.number().int().default(250),
  ai_include_pricing: z.boolean().default(false),
  ai_include_product_url: z.boolean().default(false),
  ai_prioritize_relevance: z.boolean().default(true),
  ai_keyword_penalty: z.enum(["none", "light", "strict"]).default("light"),
  ai_boost_repeat_posters: z.boolean().default(false),
  notification_email: z.boolean().default(true),
  notification_slack: z.string().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type Profile = z.infer<typeof ProfileSchema>

// Notification entity
export const NotificationSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  type: z.enum(["opportunity", "proposal", "subscription", "alert"]),
  title: z.string(),
  body: z.string().nullable(),
  link: z.string().nullable(),
  is_read: z.boolean().default(false),
  created_at: z.string().optional(),
})

export type Notification = z.infer<typeof NotificationSchema>

// Activity log
export const ActivityLogSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  entity_type: z.enum(["product", "opportunity", "proposal", "platform"]),
  entity_id: z.string().uuid(),
  action: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().optional(),
})

export type ActivityLog = z.infer<typeof ActivityLogSchema>

// Input schemas for creating
export const CreateProductInput = ProductSchema.omit({ id: true, created_at: true, updated_at: true })
export type CreateProductInput = z.infer<typeof CreateProductInput>

export const CreateProposalInput = ProposalSchema.omit({ id: true, created_at: true, updated_at: true, status: true })
export type CreateProposalInput = z.infer<typeof CreateProposalInput>

export const UpdatePipelineInput = PipelineEntrySchema.pick({ stage: true, notes: true, deal_value: true, close_probability: true, expected_close_date: true })
export type UpdatePipelineInput = z.infer<typeof UpdatePipelineInput>