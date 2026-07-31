export type WorkspaceType = 'agency' | 'saas';
export type ProposalStatus = 'new' | 'scored' | 'drafted' | 'needs_edits' | 'approved' | 'submitted';
export type Outcome = 'pending' | 'viewed' | 'replied' | 'won' | 'lost';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
}

export interface Organization {
  id: string;
  name: string;
  billing_status: 'trial' | 'active' | 'past_due' | 'canceled';
  plan: string;
  creem_customer_id: string | null;
  ceo_enabled: boolean;
  ceo_kill_switch: boolean;
  created_by: string;
}

export interface OrgMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  organizations?: Organization;
}

export interface Workspace {
  id: string;
  organization_id: string;
  type: WorkspaceType;
  name: string;
  description: string | null;
  ideal_client_profile: string | null;
  portfolio: string | null;
  tone_style: string | null;
  product_name: string | null;
  product_description: string | null;
  product_url: string | null;
  target_customer: string | null;
  bidding_enabled: boolean;
  risk_acknowledged_at: string | null;
  visitor_intent_enabled?: boolean;
  visitor_intent_jurisdiction?: string | null;
  visitor_intent_policy_url?: string | null;
  visitor_intent_consent_at?: string | null;
}

export interface PlatformConnection {
  id: string;
  workspace_id: string;
  platform: string;
  status: string;
  kill_switch: boolean;
  credentials: unknown;
}

export interface JobPosting {
  id: string;
  workspace_id: string;
  source: string;
  platform: string;
  title: string;
  description: string | null;
  budget: string | null;
  client_stats: Record<string, unknown> | null;
  url: string | null;
  captured_at: string;
}

export interface Proposal {
  id: string;
  workspace_id: string;
  job_posting_id: string;
  status: ProposalStatus;
  mode: WorkspaceType;
  draft_content: string | null;
  fit_score: number | null;
  fit_reasoning: string | null;
  product_mentioned: boolean;
  mention_policy_applied: string | null;
  outcome: Outcome;
  submitted_at: string | null;
  viewed_at: string | null;
  replied_at: string | null;
  won_at: string | null;
  lost_at: string | null;
  created_at: string;
  job_postings?: JobPosting;
}

export interface DeliveryRun {
  id: string;
  proposal_id: string;
  workspace_id: string;
  status: 'planning' | 'running' | 'qa' | 'delivered' | 'failed' | 'cancelled';
  target_stack: 'instantdb' | 'insforge' | 'client_specified';
  stack_reasoning: string | null;
  openhands_conversation_id: string | null;
  openhands_trace: Array<Record<string, unknown>>;
  packaging_channel: string | null;
  created_at: string;
}

export interface DeliveryTask {
  id: string;
  delivery_run_id: string;
  position: number;
  description: string;
  status: 'todo' | 'running' | 'qa_pending' | 'qa_approved' | 'qa_rejected' | 'done' | 'failed';
  agent_output: string | null;
  qa_note: string | null;
  qa_approved_at: string | null;
}

export type PloybookStepKind = 'query' | 'llm' | 'stage_draft' | 'function';

export interface PloybookStep {
  key: string;
  title: string;
  kind: PloybookStepKind;
  prompt?: string;
  source?: string;
  fn?: string;
  note?: string;
  [extra: string]: unknown;
}

export interface Ploybook {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  strategy_config: Record<string, unknown>;
  steps: PloybookStep[] | null;
  active: boolean;
  created_at?: string;
}

export interface PloybookTemplate {
  id: string;
  name: string;
  description: string;
  steps: PloybookStep[];
}

export interface PloybookStepResult {
  step: number;
  key: string;
  title: string;
  kind: PloybookStepKind;
  status: 'completed' | 'failed';
  output: string;
  data?: unknown;
  started_at?: string;
  completed_at?: string;
}

export interface PloybookRun {
  id: string;
  ploybook_id: string;
  workspace_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  results: PloybookStepResult[];
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface GrowthRecommendation {
  id: string;
  workspace_id: string;
  recommendation: string;
  priority: number;
  evidence: {
    dimension?: string;
    value?: string;
    bids?: number;
    wins?: number;
    attributed_signups?: number;
    win_rate?: number | null;
    signup_rate?: number | null;
    win_lift?: number | null;
    signup_lift?: number | null;
    summary?: string;
    reason?: string;
    [extra: string]: unknown;
  } | null;
  created_at: string;
}

export interface SiteIngestionJob {
  id: string;
  workspace_id: string;
  url: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  summary: string | null;
  positioning: string | null;
  error: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface DeploySyncDraft {
  id: string;
  workspace_id: string;
  trigger_source: string | null;
  deploy_ref: string | null;
  change_summary: string | null;
  docs_draft: string | null;
  site_draft: string | null;
  status: 'draft' | 'in_review' | 'published' | 'dismissed';
  created_at: string;
}

export interface PersonaAction {
  id: string;
  organization_id: string | null;
  workspace_id: string | null;
  persona: string;
  action: string;
  params: Record<string, unknown>;
  result: string | null;
  requires_approval: boolean;
  approval_status: 'auto_approved' | 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

// --- Module C: full Growth Engine -------------------------------------------

export type GrowthDraftKind = 'page' | 'ad_creative' | 'fix' | 'metadata';
export type GrowthDraftStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'dismissed';

export interface GrowthContentDraft {
  id: string;
  workspace_id: string;
  kind: GrowthDraftKind;
  title: string;
  body: string | null;
  meta: {
    page_type?: string;
    slug?: string;
    meta_title?: string;
    meta_description?: string;
    target_keywords?: string[];
    faq?: Array<{ q?: string; a?: string }>;
    json_ld?: Record<string, unknown>;
    angle?: string;
    cta?: string;
    description?: string;
    platform?: string;
    priority?: number;
    monitor_kind?: string;
    [extra: string]: unknown;
  } | null;
  evidence: Record<string, unknown> | null;
  source: string | null;
  status: GrowthDraftStatus;
  created_at: string;
}

export interface SiteDesignProfile {
  id: string;
  workspace_id: string;
  source_url: string;
  palette: Record<string, unknown>;
  typography: Record<string, unknown>;
  components: Record<string, unknown>;
  voice: string | null;
  updated_at: string;
}

export interface SiteMonitorRun {
  id: string;
  workspace_id: string;
  kind: 'performance' | 'competitor';
  findings: Array<{ id: string; ok: boolean; severity: string; detail: string }>;
  drafts_created: number;
  created_at: string;
}

export interface AdCampaign {
  id: string;
  workspace_id: string;
  name: string;
  platform: string;
  objective: string | null;
  status: 'draft' | 'active' | 'paused' | 'ended';
  daily_budget: number | null;
  targeting: Record<string, unknown>;
  created_at: string;
  attribution_ref?: string | null;
  attributed_signups?: number;
}

export interface VisitorIntentRecord {
  id: string;
  workspace_id: string;
  visitor_key: string;
  company: string | null;
  intent_score: number | null;
  intent_reasoning: string | null;
  signals: {
    pages?: string[];
    referrer?: string | null;
    utm?: Record<string, unknown>;
    duration_seconds?: number | null;
    [extra: string]: unknown;
  };
  consent_status: 'granted' | 'denied' | 'unknown';
  jurisdiction: string | null;
  last_seen_at: string;
}

export interface VisitorIntentSettings {
  enabled: boolean;
  jurisdiction: string | null;
  policy_url: string | null;
  consent_configured_at: string | null;
  records: number;
  disclosure: string;
}

export interface JobSourceStatus {
  platform: string;
  kind: 'extension_capture' | 'api_poll';
  active: boolean;
  reason: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface CeoApprovalItem {
  id: string;
  org_id: string;
  action_type: string;
  action_payload: {
    instruction?: string;
    plan?: string;
    description?: string;
    target_workspace_ids?: string[];
    [extra: string]: unknown;
  } | null;
  requested_by_persona: string;
  status: ApprovalStatus;
  approved_by_user_id: string | null;
  approved_by_at: string | null;
  result: string | null;
  created_at: string;
}

export interface HermesMemory {
  id: string;
  workspace_id: string;
  key: string;
  value: unknown;
  updated_at: string;
}

export interface HermesSkill {
  id: string;
  workspace_id: string;
  skill_name: string;
  skill_data: {
    summary?: string;
    applies_when?: string;
    steps?: string[];
    pitfalls?: string[];
    [extra: string]: unknown;
  };
  source_delivery_run_id: string | null;
  created_at: string;
}

export interface WorkspaceMemory {
  id: string;
  workspace_id: string;
  key: string;
  kind: 'note' | 'preference' | 'decision_rule' | 'skill';
  content: string;
  source: string | null;
  updated_at: string;
}

export interface AnalyticsSummary {
  workspace: { id: string; name: string; type: WorkspaceType };
  pipeline: Record<string, number>;
  totalCaptured: number;
  averageFitScore: number | null;
  funnel: {
    sent: number; viewed: number; replied: number; won: number; lost: number;
    viewRate: number | null; replyRate: number | null; winRate: number | null;
  };
  productMention: {
    draftedWithMention: number; sentWithMention: number; wonWithMention: number;
    mentionShareOfSent: number | null;
  } | null;
  growth: { touchpoints: number; attributedSignups: number; totalSignups: number };
}

export const PERSONAS = [
  { name: 'The Scout', owns: 'Job capture assist & fit scoring', module: 'Module A', icon: '🔭' },
  { name: 'The Drafter', owns: 'Proposal writing & product-mention logic', module: 'Module A', icon: '✍️' },
  { name: 'The Builder', owns: 'Delivery execution incl. InstantDB/InsForge stack choice', module: 'Module B (OpenHands)', icon: '🔨' },
  { name: 'The Closer', owns: 'Post-win client comms & scheduling', module: 'Composio (Gmail, Calendar)', icon: '🤝' },
  { name: 'The Grower', owns: 'Site, content & attribution (SaaS workspaces)', module: 'Module C', icon: '🌱' },
  { name: 'The PM', owns: 'Win/loss, QA & attribution → roadmap suggestions', module: 'Existing data only', icon: '🧭' },
  { name: 'The CEO', owns: 'Org-level orchestration — bounded autonomy', module: 'All modules, org scope', icon: '👁️' },
] as const;
