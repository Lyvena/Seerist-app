# Seerist — Architecture

## System overview

```
┌─────────────────┐     ┌──────────────────────────────────────────────┐
│ Chrome extension │────▶│ InsForge project (si9f4zab.eu-central)       │
│ capture/autofill │     │  · Postgres + RLS (26 tables)                │
└─────────────────┘     │  · Auth (email+code verification, GitHub)    │
┌─────────────────┐     │  · 22 edge functions (/functions/<slug>)     │
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

## Edge functions (22)

| Function | Module | Purpose |
|---|---|---|
| `capture-job` | A | Extension/manual capture → `job_postings` + `proposals(new)`; enforces bidding-enabled + kill switch |
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
| `pm-insights` | D | The PM: win/loss + QA + attribution → roadmap suggestions |
| `closer-draft` | D | The Closer: post-win comms; optional real Gmail send via Composio |
| `ceo-command` | D | The CEO: bounded autonomy, allow-list enforced server-side, approval queue for everything else, full audit |
| `creem-checkout` | billing | Creem checkout session per org/plan |
| `creem-webhook` | billing | HMAC-verified subscription events → `organizations.billing_status` |
| `composio-integrations` | tools | status / connect (managed OAuth) / send_alert (Slack/Telegram/Discord/Gmail) |

## Model gateway

All LLM calls go through `POST /api/ai/chat/completion` on the project backend — the caller's JWT (or the service key) authorizes them; no separate provider account exists anywhere in the codebase. Default model `openai/gpt-4o-mini`, overridable with the `SEERIST_MODEL` env/secret.

## JobSource abstraction

`capture-job` accepts `source: extension_capture | api_poll | manual`. Extension capture is the primary, always-available path. When Upwork developer-API access is approved, an API-polling worker inserts through the same function with `source: 'api_poll'` — additive, zero architectural change (spec §4/§9 v1.x track).

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

## Ploybooks (Module C)

A Ploybook is an ordered list of steps stored on `ploybooks.steps`; `ploybook_runs` records status, current step and per-step results. Steps are data, not code — `query` (pull real rows), `llm` (reason over the evidence gathered so far), `stage_draft` (park output in `deploy_sync_drafts`), `function` (call another Seerist function). Three templates ship as constants in `ploybooks-execute`: SEO/AEO Boost, Competitor Migration Bids, Post-Win Attribution. Nothing a Ploybook produces is published or sent.

## CEO approval queue (Module D)

`spend_money`, `create_contract`, `delete_workspace`, `delete_organization`, `archive_resource`, `send_external_communication` and anything the classifier cannot place are inserted into `ceo_approval_queue` with `status: 'pending'` and return `{ status: 'pending_approval', queue_id }` — they never execute on classification. `approve_action(queue_id, approved_by_user_id)` is what executes them; `reject_action(queue_id, user_id)` discards them. Both decisions update the linked `persona_action_log` row. RLS lets org members read the queue and only org owners/admins write decisions; the UI (`CEOApprovalQueue.tsx`) subscribes to the `ceo-approvals:<org_id>` realtime channel and falls back to polling where realtime is not configured.
