# Seerist — Compliance stance

These are architectural constraints, not settings. They exist in code paths, not policy documents.

## 1. No automated submission — ever

- The Chrome extension's autofill inserts an approved draft into the platform's own proposal editor. **The human clicks the platform's Submit button.** There is no code path anywhere in this repository that clicks, posts, or submits to a freelance platform.
- `update-proposal-status` records "submitted" AFTER the human has done it — it writes our database, never the platform.

## 2. Zero automated reads at launch

- Job discovery is 100% extension-capture: the content script reads the DOM of a page the user is already viewing. Seerist servers make no requests to Upwork.
- The `api_poll` JobSource is a stub that only activates once a platform's developer API access is approved and credentials exist in `platform_connections` — applying for the Upwork key is a parallel, non-blocking track.

## 3. Risk disclosure before bidding

- `workspaces.bidding_enabled` stays false until the user completes onboarding and acknowledges the plain-language risk disclosure (`risk_acknowledged_at`). `capture-job` refuses (HTTP 423) while disabled.

## 4. Per-platform kill switch

- `platform_connections.kill_switch` instantly halts capture and drafting for that platform (`capture-job` checks it, HTTP 423). Managed in Settings → Platforms.

## 5. Product-mention policy is manually curated

- `policy_configs` (platform → link_allowed | description_only | no_mention, versioned) is maintained by hand. It is **never** auto-inferred from scraped ToS text — misreading a ToS clause is a bigger risk than curation overhead.
- A platform without a configured row defaults to **no_mention** in `draft-proposal`.

## 6. Human-in-the-loop everywhere

- Scoring and drafting are assistive; nothing is sent without human approval and a human submit.
- Delivery: every task output parks at `qa_pending`; `complete-delivery-run` re-verifies server-side that every task is `qa_approved` before a run can be marked delivered.
- Growth: deploy-sync output is always a draft (PR text / staged copy) — the "published" status only records that a human shipped it elsewhere.
- CEO persona: see below.

## 7. CEO bounded autonomy (Module D)

Enforced in `ceo-command` by a server-side allow-list — the model classifies, the server decides:

| Autonomous (logged, auto_approved) | Always requires human approval (logged, pending) |
|---|---|
| Reprioritize backlog items across workspaces | Anything involving money (spend, pricing, billing) |
| Reallocate tasks between personas | Legal or contractual commitments |
| Adjust non-monetary workspace settings | Deleting/archiving a workspace or organization |
| Surface cross-workspace insights | Any externally-sent communication on the org's behalf |

- Every action (executed or blocked) lands in `persona_action_log` with params, result, and approval state.
- `organizations.ceo_kill_switch` halts all CEO activity immediately (HTTP 423).
- The allow-list is a starting recommendation per the spec — expand it deliberately, action by action, with founder/legal sign-off.

## 8. Full auditability

- `proposal_status_history` — every pipeline transition, who, when, why.
- `persona_action_log` — every AI persona action across all modules.
- `delivery_runs.openhands_trace` — every delivery event (creation, execution, delivery, OpenHands conversation ids).
- InsForge itself audit-logs raw SQL and admin operations platform-side.
