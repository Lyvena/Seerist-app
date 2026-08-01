# AGENTS.md — working on Seerist

Read this before changing anything. `seerist-product-specification.md` in the
repo root is the authoritative spec; this file is the operating summary.

Seerist helps agencies and SaaS companies **win freelance work safely, deliver
it with AI-assisted execution, grow continuously between contracts, and run
operations through named AI employees**. For a SaaS workspace every bid is also
a brand touchpoint: it either wins the contract, drives a product signup, or at
minimum puts the product in front of someone who needed it.

---

## Two permanent boundaries — never loosen these

These are not feature flags awaiting a braver release. A coding agent's instinct
toward "more autonomous by default" runs directly against both, so both are
enforced server-side **and** covered by tests in `tests/permanent-boundaries.test.ts`.
If a change makes those tests fail, the change is wrong.

1. **No proposal submission that bypasses a human click** on any platform,
   without that platform's explicit authorization. The authorized-partnership
   path exists in `insforge/functions/submit-proposal.ts`, fully built, gated on
   `policy_configs.authorized_submission` — false for every platform, writable
   only by the service role because `policy_configs` has a SELECT policy and no
   client write policy. There is no scripted `.click()` anywhere in the codebase.
   Scripted submission on a user's own session is what gets customer accounts
   permanently banned.

2. **The CEO persona never acts alone on money, contracts or deletions.**
   `spend_money`, `create_contract`, `delete_workspace`, `delete_organization`,
   `archive_resource`, `send_external_communication` — and anything the
   classifier cannot place — are inserted into `ceo_approval_queue` as `pending`
   and return `{ status: 'pending_approval' }`. Only `approveAction` executes
   them. Four classes auto-execute: reprioritize backlog, reallocate tasks,
   adjust non-monetary settings, surface insights. An org-level kill switch
   halts everything from the CEO screen.

Related hard rules: **nothing the Growth Engine produces is ever auto-published**
(pages, ad creative and fixes all land in `growth_content_drafts` as drafts), and
**visitor identification is off until a human declares a jurisdiction and a live
privacy-policy URL**.

---

## Repository layout

| Path | What it is |
|---|---|
| `web/` | Vite + React + TypeScript app — the product UI |
| `extension/` | Chrome extension (MV3): capture + autofill across four platforms |
| `insforge/functions/` | 28 InsForge edge functions (Deno), one file each |
| `insforge/schema.sql` | The entire Postgres schema, idempotent, applied whole |
| `insforge/scripts/` | apply-schema, deploy-functions, deploy-site |
| `tests/` | Vitest suite — boundaries, schema safety, extension, model tiering |
| `docs/` | architecture, compliance, integrations setup |

> The spec sketched a `packages/*` monorepo. The shipped shape is the four
> directories above and it is deployed and working; do not restructure it
> without a concrete reason. The boundaries the spec cares about are enforced by
> code and tests, not by folder names.

### The one thing that surprises people

Edge functions are **single-file**. `deploy-functions.mjs` replaces the
`// @include _shared` marker with the whole of `functions/_shared.ts` before
upload, so every function references helpers it never declares. That is why:

- `npm run typecheck:functions` inlines first, then runs `tsc` — checking the
  raw sources would miss real errors.
- ESLint disables `no-undef` for that directory.
- **Editing `_shared.ts` means redeploying all 28 functions**, not just one.

---

## Architecture

Seerist is **InsForge-native**. Postgres + RLS, auth, edge functions, the model
gateway and site hosting are all one InsForge project (`si9f4zab`). The frontend's
only backend dependency is `@insforge/sdk`.

Three external services do things InsForge does not, and each is called **only
from inside an edge function** with its key held as an InsForge project secret:
**Creem** (Merchant of Record billing), **Composio** (Slack/Gmail/Calendar/CRM/
Drive/Notion/LinkedIn managed OAuth), **OpenHands** (optional delivery sandbox).
Never add a third-party SDK to browser code.

### Model gateway and plan tiering

Every LLM call goes through `aiChat()`, which takes a `scope` naming the
workspace or organization paying for it. `resolveModel()` then:

- reads the **live** catalog (`GET /api/ai/models`) — never a hardcoded list;
- **free plans** are hard-capped by `billing_plans.limits.max_model_input_price`
  (default `0`, meaning genuinely zero-cost models only);
- **paid plans** get their pinned model, or the highest-ranked family in
  `model_preferences`, newest version first — so a future `claude-opus-6`
  becomes the default automatically;
- meters the call in `ai_usage_log` and enforces the plan's monthly cap.

Adding an `aiChat` call? **Pass a scope**, or the call escapes plan enforcement.

---

## The four modules

**A — Bid & Proposal Engine.** Capture a job with the extension (Upwork, Fiverr,
Freelancer.com, Toptal — one adapter each, shared generic fallbacks) → AI fit
score *with plain-language reasoning, never a bare number* → AI draft, applying
`policy_configs.mention_policy` per platform → Kanban review → autofill →
**you click submit**. `job-sources.ts` holds the JobSource interface;
`ApiPollSource` exists per platform and fails closed until that platform's
developer key is approved. Per-platform mention policy is **manually curated,
never inferred from scraped text**; an unreviewed platform stays `no_mention`.

**B — Delivery Engine.** Won contract → task decomposition → DAG execution
(`task_dependencies`, topological order, dependency gating) → **mandatory human
QA on every task** → packaged handoff. Hermes (`hermes_memories`,
`hermes_skills`) carries workspace memory and skills learned from delivered
runs. Default stack: InstantDB for real-time/collaborative deliverables,
InsForge for fuller server-side needs, never forced over a client's own choice.

`delivery-stack` provisions the client's **own** InsForge project through the
co-branded partnership API — a *different* project from Seerist's own backend.
Do not conflate the two. Three invariants, all covered by
`tests/delivery-stack.test.ts`: the client's API key is **never persisted**
(read live at handoff, audited each time), a plan limit returns the client's
existing projects to attach rather than failing, and an `instantdb` run is
refused rather than half-provisioned. Only InsForge provisioning exists;
InstantDB remains advisory (it changes one word in the Builder's prompt and
nothing else).

**C — Growth Engine.** Site and doc ingestion → bid→signup attribution →
autonomous site generation with schema markup → ad creative and campaigns →
consent-gated visitor intent → Ploybooks → deploy-triggered docs/site drafts.
Ad, bid and site conversions share one `growth_touchpoints` model.

**D — AI Employees.** Seven personas over the same reasoning layer, each with a
real action and its own feed from `persona_action_log`: Scout, Drafter, Builder,
Closer, Grower, PM (read-only), CEO (org-level, bounded by the gate above).

---

## Tenancy

One email → many organizations → many workspaces. Membership is a **join table
at both levels, each carrying a role** — not a foreign key on the user. Every
module record hangs off `workspace_id`; billing and the CEO persona hang off
`organization_id`. Every table has RLS; helpers (`seerist_is_org_member`,
`seerist_is_ws_member`, …) are `SECURITY DEFINER` so policies do not recurse.

---

## Working here

```bash
npm install && npm --prefix web install   # once
npm run verify                            # lint + both typechecks + tests
npm test                                  # tests only
```

Deploying (needs `INSFORGE_BASE_URL` and `INSFORGE_API_KEY`):

```bash
node insforge/scripts/apply-schema.mjs        # idempotent, safe to re-run
node insforge/scripts/deploy-functions.mjs    # all 29, or pass slugs
npm --prefix web run build && node insforge/scripts/deploy-site.mjs
```

Two workflows run in CI. `ci.yml` is the gate: lint, both typechecks, the
Vitest suite, and a real PostgreSQL parse of `schema.sql`. `deploy-sync.yml`
fires after a push to `main` touching the code or API surface and asks the
`deploy-sync` function to draft docs and marketing copy for the change; it
skips itself unless `DEPLOY_SYNC_TOKEN` (secret) and `DEPLOY_SYNC_WORKSPACE_ID`
(variable) are set on the repository, and it publishes nothing.

**Schema changes go at the end of `insforge/schema.sql`** as an appended
idempotent block (`create table if not exists`, `add column if not exists`,
`drop policy if exists` before `create policy`). The whole file is re-applied
every time, so nothing may be destructive.

**Review every diff** touching `platform_connections`, `extension/`,
`submit-proposal.ts`, `ceo-command.ts`, billing, or `_shared.ts`.
