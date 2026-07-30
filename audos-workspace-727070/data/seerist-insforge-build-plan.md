# Seerist — InsForge-Native Build Plan (Ordered Prompt List)

Prepared from `seerist-product-specification.md` (July 30, 2026 consolidated rebuild).
This is the execution plan the build agent will follow once credentials are provided.

## Target

- **Backend/data:** InsForge project `cefd08b8-a1d1-428c-88ce-98601a5fbc07` (Postgres, auth, storage, realtime, edge functions, model gateway for ALL LLM calls).
- **Repo:** `https://github.com/Lyvena/Seerist-app` (currently returns 404 — private or not yet created; PAT required to push).
- **Payments:** Creem (Merchant of Record), NOT Stripe — custom edge-function checkout + webhook against `organizations.billing_status`.
- **Later phases:** OpenHands (delivery execution, v1.0), Hermes Agent (per-workspace memory, v1.0), Composio (Slack/Gmail/Calendar/CRM/Drive/Notion alerts + tools, v1.5), Personas incl. bounded-autonomy CEO (v2.0).
- **Explicitly out:** Grok Build, OpenWorker, Ploy.ai, Marblism, Sintra (no code relationship). No scripted/automated proposal submission — ever. No server-side Upwork polling until developer API access is approved.

## Credentials needed before development starts (requested from founder)

1. **GitHub PAT** with `repo` (contents: read/write) access to `Lyvena/Seerist-app`. If the repo does not exist yet, either create it first or grant a PAT that can create repos in the `Lyvena` org.
2. **Composio API key** (v1.5 integration layer; requested up-front per founder instruction — OAuth app verification lead times are long, so early setup is deliberate).
3. **InsForge user API key (`uak_...`)** — the CLI in a headless VM can only authenticate via `insforge login --user-api-key uak_...` (or `--device` approval). Without it, `npx @insforge/cli link --project-id cefd08b8-a1d1-428c-88ce-98601a5fbc07` cannot run.

## Ordered build prompts (v0.1 MVP first — Module A + tenancy)

### Prompt 1 — Scaffold the monorepo
Create the repo layout:
```
/web            React + Vite + TypeScript app (Seerist dashboard)
/extension      Chrome extension (MV3): capture + autofill, local queue
/insforge       schema migrations, edge functions, seed scripts
/docs           architecture notes, compliance guardrails, policy_config curation guide
```
Initialize with README describing the four modules, phased roadmap (v0.1 → v3.0), and hard compliance constraints (human-click-only submission; extension-capture-only ingestion at launch).

### Prompt 2 — Link InsForge and create the tenancy schema (BUILD FIRST)
`insforge login --user-api-key <uak>` then `insforge link --project-id cefd08b8-a1d1-428c-88ce-98601a5fbc07`.
Create tables (every later record hangs off `workspace_id` / `organization_id`):
- `users` (id, email unique, name, created_at) — mapped onto InsForge auth identities.
- `organizations` (id, name, billing_status default 'trial', creem_customer_id, plan).
- `organization_memberships` (user_id, organization_id, role) — role lives on the join.
- `workspaces` (id, organization_id, type 'agency'|'saas', name, description, ideal_client_profile, portfolio, tone_style, product_name, product_description, product_url, target_customer, bidding_enabled default false).
- `workspace_memberships` (user_id, workspace_id, role).
- `platform_connections` (workspace_id, platform, credentials nullable — unused until API access exists).
Add RLS/row policies so every query is scoped by membership.

### Prompt 3 — Module A data model
- `job_postings` (workspace_id, source 'extension_capture'|'api_poll', title, description, budget, client_stats jsonb, url, captured_at).
- `proposals` (workspace_id, job_posting_id, status 'new'|'scored'|'drafted'|'needs_edits'|'approved'|'submitted', draft_content, fit_score int, fit_reasoning text, product_mentioned bool, mode 'agency'|'saas', submitted_at, viewed_at, replied_at, won_at).
- `proposal_status_history` (proposal_id, from_status, to_status, changed_by, changed_at).
- `policy_configs` (platform, mention_policy 'link_allowed'|'description_only'|'no_mention', version, updated_at) — manually curated + versioned; **default to 'no_mention' when a platform has no row**.
Seed `policy_configs` with an Upwork row.

### Prompt 4 — JobSource abstraction (stub API polling)
Define a `JobSource` interface (`capture(job)`, `poll()` stub) with `ExtensionCaptureSource` as the only live implementation. `ApiPollSource` is a typed stub that throws `NotEnabled` — API polling slots in later (v1.x) without architectural change. Document the Upwork developer-key application as a parallel non-blocking track.

### Prompt 5 — Edge functions (InsForge) for Module A
- `capture-job` — receives extension payload, inserts `job_postings`, creates a `proposals` row in status 'new'.
- `score-job` — calls the InsForge model gateway: scores fit 0–100 against the workspace `ideal_client_profile` and returns plain-language reasoning (never a bare number). Writes `fit_score` + `fit_reasoning`, moves status → 'scored', logs to `proposal_status_history`.
- `draft-proposal` — model-gateway draft. Agency mode: tone/style + portfolio references. SaaS mode: same + product-mention logic reading `policy_configs` (link_allowed → include URL; description_only → describe without link; no_mention → omit entirely). Sets `product_mentioned`, status → 'drafted'.
- `update-proposal-status` — validated Kanban transitions with history logging.
- `analytics-summary` — sent/viewed/replied/won counts + product-mentioned flag stats per workspace.
- `creem-checkout` + `creem-webhook` — checkout session creation and subscription-event processing against `organizations.billing_status` (custom, since InsForge native billing is Stripe-specific).

### Prompt 6 — Web app (React + InsForge SDK)
- Auth (InsForge auth), org/workspace switcher honoring the membership model.
- Workspace onboarding wizard (required before `bidding_enabled`): agency fields; SaaS adds product name/description/URL, target customer, per-platform policy selection. Include the explicit **risk disclosure** before enabling bidding, and a per-platform **kill switch**.
- Pitch Queue: job feed, Kanban (New → Scored → Drafted → Needs edits → Approved → Submitted), proposal editor showing fit score WITH reasoning, product-mention badge.
- Analytics dashboard: sent/viewed/replied/won funnel; SaaS workspaces additionally see product-mentioned tracking split from win rate.

### Prompt 7 — Chrome extension (MV3, dual-duty)
- Content script on Upwork job pages: "Capture to Seerist" button reads title/description/budget/client stats from the rendered DOM → POST to `capture-job`.
- Content script on the Upwork proposal editor: "Autofill approved draft" fills the textarea; the human clicks Upwork's own Submit. **No scripted or automated click under any circumstances — hard architectural constraint.**
- Offline resilience: queue captures in `chrome.storage.local` when the API is unreachable; sync on restore.

### Prompt 8 — Push v0.1 to GitHub
Commit the monorepo to `Lyvena/Seerist-app` using the founder's PAT; verify CI-less build instructions in README (web dev server, extension load-unpacked, insforge CLI commands).

### Prompt 9 — Module B (v1.0): delivery engine
- Tables: `delivery_runs` (proposal_id, workspace_id, status, target_stack 'instantdb'|'insforge'|'client_specified', openhands_trace), `delivery_tasks` (delivery_run_id, description, status, agent_output, qa_approved_by, qa_approved_at).
- Trigger on proposal marked won (manual in v1.0). Task decomposition via model gateway; execution via OpenHands (Docker Agent Server or OpenHands Cloud; native GitHub/GitLab for handoff).
- Default-stack decision rule (InstantDB for client-heavy/real-time, InsForge for fuller server-side) stored in the Hermes memory layer; always overridable per job.
- **Mandatory human QA checkpoint** before any deliverable is client-ready; full trace stored for audit.
- Hermes Agent self-hosted; LLM access via InsForge gateway; its native messaging connectors NOT used (Composio owns that surface).

### Prompt 10 — Module C (v1.5 partial): growth engine
- Tables: `growth_touchpoints` (proposal_id, workspace_id, product_mentioned, attributed_signup_id), `ploybooks` (workspace_id, name, strategy_config), `site_ingestion_jobs`, `deploy_sync_drafts` (pr_url, preview_url, status).
- Site/product ingestion grounding Module A's product-mention drafting; bid→signup attribution loop; named reusable Ploybooks; deploy-triggered docs/site sync — output is ALWAYS a draft (PR / staged preview), never auto-published.

### Prompt 11 — Module D (v2.0): personas + bounded-autonomy CEO
- Table: `persona_action_log` (organization_id, workspace_id, persona, action, params, approved_by, auto_approved, timestamp).
- Seven personas (The Scout, The Drafter, The Builder, The Closer, The Grower, The PM, The CEO) as thin branded interfaces over shared Hermes reasoning + Composio tools.
- CEO: org-level; auto-allowed = backlog reprioritization, task reallocation, non-monetary settings, cross-workspace insights; approval-required = money, legal/contractual commitments, delete/archive org or workspace, any external comms. Full audit log + org-level kill switch. Allow-list needs founder/legal sign-off before shipping.

### Prompt 12 — Composio layer (v1.5)
Managed-OAuth connections for Slack/Telegram/Discord alerts, Gmail, Calendar, CRM, Drive, Notion. NOT used for Creem (native) or GitHub/GitLab (OpenHands native) — one integration path per external service.

## Success criteria (from spec §10)
Proposals/week, reply + win rate, time-to-submit, zero platform bans; QA-rejection rate and win-to-delivery time; signups attributed to bid touchpoints; persona engagement and zero CEO actions outside the allow-list.
