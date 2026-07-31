# Seerist — Architecture

## System overview

```
┌─────────────────┐     ┌──────────────────────────────────────────────┐
│ Chrome extension │────▶│ InsForge project (si9f4zab.eu-central)       │
│ capture/autofill │     │  · Postgres + RLS (31 tables)                │
└─────────────────┘     │  · Auth (email+code verification, GitHub)    │
┌─────────────────┐     │  · 27 edge functions (/functions/<slug>)     │
│ Web app (React)  │────▶│  · Model Gateway (/api/ai/chat/completion)  │
│ si9f4zab         │     │  · Sites hosting (web/dist)                 │
│  .insforge.site  │     └───────────────┬──────────────────────────────┘
└─────────────────┘                     │
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
                 Creem (MoR)       Composio (OAuth)   OpenHands (sandbox)
                 checkout+webhook  Slack/Gmail/…      delivery execution
```

## Tenancy (build-first, everything hangs off it)

- `profiles` — the spec's `users`: one row per email, same UUID as the InsForge auth identity.
- `organizations` ←→ `organization_memberships` (role on the join) ←→ users.
- `workspaces` (type `agency` | `saas`) ←→ `workspace_memberships` (role on the join).
- Org-level: billing (`billing_status`, `creem_customer_id`), CEO persona (`ceo_enabled`, `ceo_kill_switch`).
- Every Module A–D table carries `workspace_id` (or `organization_id` for the CEO log).

### RLS design

- Helper functions (`seerist_is_org_member/admin/owner`, `seerist_is_ws_member`, …) are `SECURITY DEFINER` so policies don't recurse.
- Membership tables include `user_id = auth.uid()` in their SELECT policies — required because `INSERT … RETURNING` evaluates SELECT policies against the statement snapshot, which does not yet contain the row being inserted (the org-creation bootstrap would fail otherwise).
- `policy_configs` is read-only reference data for clients; curation happens via the service role only.
- Webhook-facing functions (`creem-webhook`, `track-signup`, `deploy-sync` in CI mode) use the `SERVICE_API_KEY` secret; every user-facing function forwards the caller's JWT so RLS applies end-to-end.

## Edge functions (27)

| Function | Module | Purpose |
|---|---|---|
| `capture-job` | A | Extension/manual capture → `job_postings` + `proposals(new)`; enforces bidding-enabled + kill switch |
| `job-sources` | A | The JobSource registry: ExtensionCaptureSource (always live) + an ApiPollSource per platform, code-complete and failing closed with `NOT_ENABLED` until that platform's developer access is approved |
| `submit-proposal` | A | The authorized-partnership submission path. Refuses with 423 and hands back to the human click unless `policy_configs.authorized_submission` is true for that platform (it is false everywhere) |
| `score-job` | A | Fit score 0–100 **with plain-language reasoning** via model gateway |
| `draft-proposal` | A | Agency/SaaS drafting; product-mention per curated `policy_configs` (absent ⇒ no_mention); creates growth touchpoints |
| `update-proposal-status` | A | Validated Kanban transitions + `proposal_status_history` |
| `record-outcome` | A | viewed/replied/won/lost funnel timestamps |
| `analytics-summary` | A/C | sent/viewed/replied/won + mention stats + attribution counts |
| `trigger-delivery-run` | B | Won contract → stack decision (memory rule) → task decomposition → optional OpenHands conversation |
| `execute-delivery-task` | B | DAG orchestration: topological order, dependency gating, per-task status, run roll-up → `qa_pending` (mandatory human QA) |
| `hermes-memory` | B | Persistent per-workspace memory (`hermes_memories`) + skill library extracted from delivered runs (`hermes_skills`) |
| `qa-task` | B | Human approve/reject with feedback loop |
| `complete-delivery-run` | B | Server-enforced QA gate → delivered + skill extraction into memory |
| `site-ingest` | C | Fetch + summarize the SaaS site; grounds product-mention drafting |
| `deploy-sync` | C | CI webhook → docs + site **drafts** (never auto-published) |
| `track-signup` | C | Public endpoint attributing signups back to bids (`?seerist_ref=`); fires `growth-feedback` on each attribution |
| `growth-feedback` | C | Segments bids by platform/mention policy/product link/job type, computes win + signup lift vs baseline → `growth_recommendations` |
| `ploybooks-execute` | C | Runs a Ploybook's steps in order (query → llm → stage_draft → function), recording each step's result |
| `site-studio` | C | Design-system reconstruction, page generation with JSON-LD + metadata, and performance/competitor monitoring that drafts fixes |
| `ads-studio` | C | Ad creative generation, campaign records, and full-funnel attribution through the shared touchpoint model |
| `visitor-intent` | C | Consent-gated visitor identification and behavioural intent scoring; public ingest refuses until the workspace opts in |
| `pm-insights` | D | The PM: win/loss + QA + attribution → roadmap suggestions |
| `closer-draft` | D | The Closer: post-win comms; optional real Gmail send via Composio |
| `ceo-command` | D | The CEO: bounded autonomy, allow-list enforced server-side, approval queue for everything else, full audit |
| `creem-checkout` | billing | Creem checkout session per org/plan |
| `creem-webhook` | billing | HMAC-verified subscription events → `organizations.billing_status` |
| `composio-integrations` | tools | status / connect (managed OAuth) / send_alert (Slack/Telegram/Discord/Gmail) |

## Model gateway

All LLM calls go through `POST /api/ai/chat/completion` on the project backend — the caller's JWT (or the service key) authorizes them; no separate provider account exists anywhere in the codebase. Default model `openai/gpt-4o-mini`, overridable with the `SEERIST_MODEL` env/secret.

## Multi-platform ingestion (Module A)

The Chrome extension carries a **per-platform adapter** (page selectors for title, description, budget, client stats, plus the proposal-editor field) for Upwork, Fiverr, Freelancer.com and Toptal, each falling back to shared generic heuristics so a layout change degrades to a usable capture rather than a dead button. `policy_configs` has a row per platform; the three added alongside Upwork ship at the safe `no_mention` default and must be manually curated from each platform's live ToS before any product mention is allowed (spec §4/§11 — never auto-detected).

## JobSource abstraction

`job-sources` implements the interface. `ExtensionCaptureSource` is always live and is never removed. `ApiPollSource` exists per platform with real response normalisation and the same insert pipeline as `capture-job` (`job_postings` + a `new` proposal, `source: 'api_poll'`), and fails closed with `NOT_ENABLED` until **both** `policy_configs.api_polling_enabled` is true for the platform **and** the workspace's `platform_connections` row is active with credentials. No platform endpoint is hard-coded — base URL and paths come from those stored credentials when access is granted.

## Submission boundary (permanent)

`submit-proposal` has three outcomes: `check` reports which mode applies, `mark_submitted` records a submission the human made themselves, and `submit` either goes through an authorized partner API or returns 423 pointing back at the human click. The authorized path is gated on `policy_configs.authorized_submission`, false for every platform and writable only server-side (`policy_configs` has no client write policy). There is no scripted click on a user's own session anywhere in the codebase — spec §1, §6 and §12.

## Delivery stack decision (Module B)

The default rule lives in `workspace_memories` (`kind: decision_rule`, seeded at onboarding):
InstantDB for client-heavy/real-time deliverables; InsForge for fuller server-side stacks. `trigger-delivery-run` asks the gateway to apply the rule to the actual job, records the reasoning on the run, and always accepts an explicit override (`client_specified` is never second-guessed).

## Task DAG (Module B)

`task_dependencies(task_id, depends_on_task_id)` holds the edges; `execute-delivery-task` orders them with Kahn's algorithm, tie-broken by `position` so a run with no declared edges keeps its original sequence. A task runs only once every dependency is QA-approved (pass `dependency_mode: 'executed'` to unblock on execution instead), downstream tasks receive their upstream outputs as context, and cycles are rejected rather than silently reordered. Per-task status stays independent; the run's status is rolled up from all of them — `delivered` remains a human decision made in `complete-delivery-run`.

| Request | Effect |
|---|---|
| `{ task_id }` | Execute one task (dependency-gated; `force: true` overrides) |
| `{ delivery_run_id }` | Execute every currently-unblocked task in topological order |
| `{ delivery_run_id, action: 'graph' }` | Inspect order, blockers and progress without executing |
| `{ delivery_run_id, action: 'plan_dependencies' }` | Infer the DAG (consulting the Hermes skill library first) |
| `{ delivery_run_id, action: 'set_dependencies', dependencies }` | Set the edges explicitly |

## OpenHands / Hermes

- **OpenHands**: when `OPENHANDS_API_KEY` is set (OpenHands Cloud or self-hosted Agent Server via `OPENHANDS_BASE_URL`), `trigger-delivery-run` starts a real sandboxed conversation and stores its id + trace events. Without it, tasks execute through the model gateway inside Seerist — same task model, same mandatory QA gate.
- **Hermes memory**: `hermes_memories` (key → jsonb) is the structured store, `hermes_skills` the skill library distilled from QA-approved delivery runs. `workspace_memories` remains the free-text notes store (preferences, decision rules, positioning from site ingestion); the Builder reads all three before decomposing or executing. Hermes Agent's native messaging connectors are NOT used — Composio owns the messaging surface (one integration path per service).

## Grower feedback loop (Module C)

`growth-feedback` reads `growth_touchpoints` joined to proposals and job postings, groups bids by platform / mention policy / product-link flag / job type / workspace mode, and computes each segment's win and attributed-signup rate against the workspace baseline. A segment needs at least 3 bids before it can claim a pattern. Numbers are computed in code; the model only phrases them. Output replaces `growth_recommendations` wholesale so stale advice never competes with the current read, and the analysis re-runs automatically after each new signup attribution.

## Site generation and maintenance (Module C)

`site-studio` reconstructs the design system from the live site by extracting the real colour, font-stack, radius and CSS-variable values deterministically first, then having the model name and organise them — it cannot invent a palette. Generated pages produce copy, meta title/description, slug, keywords and an FAQ, and the JSON-LD is assembled **in code** from the model's structured fields so the markup is always valid. Monitoring runs ten checkable technical signals against a live URL (title, meta description, H1, JSON-LD, Open Graph, canonical, viewport, image alt text, page weight, response time) or reads competitor pages; anything failing becomes a drafted fix in `growth_content_drafts`. Nothing is ever published — `published` only records that a human shipped it.

## Ads and unified attribution (Module C)

`ads-studio` manages `ad_campaigns` and drafts creative. Attribution deliberately reuses `growth_touchpoints`: a campaign gets a touchpoint row with `source='ad'` and `campaign_id` set (`proposal_id` is now nullable), and that row's id is the `?seerist_ref` value on the ad's landing URL. `track-signup` resolves a ref as either a proposal id (bids) or a touchpoint id (ads/site), so both funnels land in one model and `analytics-summary` and `growth-feedback` see them without special-casing. Campaign state is recorded locally; pushing to an external ad network is reported as not-connected rather than faked.

## Visitor intent (Module C) — built closed

`workspaces.visitor_intent_enabled` defaults to false. `enable_tracking` requires a named jurisdiction **and** a live privacy-policy URL and records when consent was configured. The public `record_visit` endpoint returns 423 while tracking is off, stores nothing at all when a visitor's consent is `denied`, and skips identity enrichment when it is `unknown`. Scoring reasons only over behavioural signals (which pages, how long, referrer, campaign) and is explicitly instructed never to infer identity or demographics. Spec §4/§6/§11 treat the legal review as a prerequisite, not an engineering task.

## Ploybooks (Module C)

A Ploybook is an ordered list of steps stored on `ploybooks.steps`; `ploybook_runs` records status, current step and per-step results. Steps are data, not code — `query` (pull real rows), `llm` (reason over the evidence gathered so far), `stage_draft` (park output in `deploy_sync_drafts`), `function` (call another Seerist function). Three templates ship as constants in `ploybooks-execute`: SEO/AEO Boost, Competitor Migration Bids, Post-Win Attribution. Nothing a Ploybook produces is published or sent.

## CEO approval queue (Module D)

`spend_money`, `create_contract`, `delete_workspace`, `delete_organization`, `archive_resource`, `send_external_communication` and anything the classifier cannot place are inserted into `ceo_approval_queue` with `status: 'pending'` and return `{ status: 'pending_approval', queue_id }` — they never execute on classification. `approve_action(queue_id, approved_by_user_id)` is what executes them; `reject_action(queue_id, user_id)` discards them. Both decisions update the linked `persona_action_log` row. RLS lets org members read the queue and only org owners/admins write decisions; the UI (`CEOApprovalQueue.tsx`) subscribes to the `ceo-approvals:<org_id>` realtime channel and falls back to polling where realtime is not configured.
