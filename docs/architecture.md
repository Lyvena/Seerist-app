# Seerist — Architecture

## System overview

```
┌─────────────────┐     ┌──────────────────────────────────────────────┐
│ Chrome extension │────▶│ InsForge project (si9f4zab.eu-central)       │
│ capture/autofill │     │  · Postgres + RLS (19 tables)                │
└─────────────────┘     │  · Auth (email+code verification, GitHub)    │
┌─────────────────┐     │  · 19 edge functions (/functions/<slug>)     │
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

## Edge functions (19)

| Function | Module | Purpose |
|---|---|---|
| `capture-job` | A | Extension/manual capture → `job_postings` + `proposals(new)`; enforces bidding-enabled + kill switch |
| `score-job` | A | Fit score 0–100 **with plain-language reasoning** via model gateway |
| `draft-proposal` | A | Agency/SaaS drafting; product-mention per curated `policy_configs` (absent ⇒ no_mention); creates growth touchpoints |
| `update-proposal-status` | A | Validated Kanban transitions + `proposal_status_history` |
| `record-outcome` | A | viewed/replied/won/lost funnel timestamps |
| `analytics-summary` | A/C | sent/viewed/replied/won + mention stats + attribution counts |
| `trigger-delivery-run` | B | Won contract → stack decision (memory rule) → task decomposition → optional OpenHands conversation |
| `execute-delivery-task` | B | Runs one task → parks at `qa_pending` (mandatory human QA) |
| `qa-task` | B | Human approve/reject with feedback loop |
| `complete-delivery-run` | B | Server-enforced QA gate → delivered + skill extraction into memory |
| `site-ingest` | C | Fetch + summarize the SaaS site; grounds product-mention drafting |
| `deploy-sync` | C | CI webhook → docs + site **drafts** (never auto-published) |
| `track-signup` | C | Public endpoint attributing signups back to bids (`?seerist_ref=`) |
| `pm-insights` | D | The PM: win/loss + QA + attribution → roadmap suggestions |
| `closer-draft` | D | The Closer: post-win comms; optional real Gmail send via Composio |
| `ceo-command` | D | The CEO: bounded autonomy, allow-list enforced server-side, full audit |
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

## OpenHands / Hermes

- **OpenHands**: when `OPENHANDS_API_KEY` is set (OpenHands Cloud or self-hosted Agent Server via `OPENHANDS_BASE_URL`), `trigger-delivery-run` starts a real sandboxed conversation and stores its id + trace events. Without it, tasks execute through the model gateway inside Seerist — same task model, same mandatory QA gate.
- **Hermes-style memory**: `workspace_memories` holds preferences, decision rules, positioning (from site ingestion), and skills extracted from completed delivery runs. Hermes Agent's native messaging connectors are NOT used — Composio owns the messaging surface (one integration path per service).
