# Seerist

**Win the work. Deliver with AI. Grow the product.**

Seerist is a web platform that helps agencies and SaaS companies win freelance/services work safely, deliver it with AI-assisted execution on an agent-optimized stack, keep growing between contracts, and run day-to-day operations through a roster of named AI employees — all in one product.

For SaaS companies, every bid is also a brand touchpoint — three outcomes from one action:
1. Client hires you → **revenue**
2. Client doesn't hire, but signs up for your product → **still a win**
3. Neither happens, but the product got seen → **brand awareness at zero ad spend**

## Architecture

| Layer | Technology |
|---|---|
| Backend/data | **InsForge** (Postgres + RLS, auth, storage, edge functions) — project `cefd08b8-a1d1-428c-88ce-98601a5fbc07` at `https://si9f4zab.eu-central.insforge.app` |
| All LLM calls | **InsForge Model Gateway** (`/api/ai/chat/completion`) — no separate provider account |
| Payments | **Creem** (Merchant of Record, NOT Stripe) — custom edge functions `creem-checkout` + `creem-webhook` |
| Memory/reasoning | Hermes-style persistent per-workspace memory (`workspace_memories`) + skill learning from completed runs |
| Delivery execution | **OpenHands** sandbox when `OPENHANDS_API_KEY` is configured; model-gateway execution otherwise — mandatory human QA either way |
| Third-party tools | **Composio** managed OAuth (Slack/Telegram/Discord alerts, Gmail, Calendar, CRM, Drive, Notion). Not used for Creem or GitHub/GitLab |
| Ingestion/submission | **Chrome extension** (capture + autofill). Zero automated traffic against Upwork; every submission is a human click |

Explicitly **not** in the stack: Grok Build, OpenWorker, Ploy.ai, Marblism, Sintra (patterns borrowed where noted in the spec; zero code relationship).

## Repository layout

```
web/          React + Vite + TS dashboard (deployed to InsForge Sites)
extension/    Chrome extension (MV3): capture + autofill + offline queue
insforge/     schema.sql, edge functions (19), deploy scripts
docs/         architecture, compliance, integration setup
```

## Modules

- **Module A — Bid & Proposal Engine**: extension-capture ingestion (stub `api_poll` JobSource ready for the Upwork key), AI fit scoring with plain-language reasoning, policy-driven product-mention drafting (manually curated, versioned `policy_configs`; absent row ⇒ *no mention*), Kanban review queue (New → Scored → Drafted → Needs edits → Approved → Submitted), sent/viewed/replied/won analytics, risk disclosure + per-platform kill switch.
- **Module B — Delivery Engine**: won contract → task decomposition → sandboxed execution (OpenHands when connected) → **mandatory human QA gate (server-enforced)** → packaged handoff. Default stack decision rule (InstantDB vs InsForge) lives in workspace memory and is always overridable.
- **Module C — Growth Engine**: site/product ingestion grounding drafts, bid→signup attribution loop (`track-signup` public endpoint + `?seerist_ref=`), named reusable Ploybooks, deploy-triggered docs & site sync (always drafts, never auto-published).
- **Module D — AI Employees**: The Scout, The Drafter, The Builder, The Closer, The Grower, The PM, and The CEO with **bounded autonomy** — an org-scoped allow-list enforced server-side, full audit log (`persona_action_log`), and an org-level kill switch.

## Tenancy

```
User (email, global identity — `profiles` mirrors InsForge auth)
  └─ organization_memberships (role) → organizations   (billing, CEO persona)
       └─ workspace_memberships (role) → workspaces    (type: agency | saas)
```

Every module record hangs off `workspace_id`; org-level features hang off `organization_id`. All tables use Postgres RLS scoped through membership.

## Development

```bash
# Web app
cd web && npm install && npm run dev

# Apply schema / deploy functions (needs the project API key)
INSFORGE_BASE_URL=https://si9f4zab.eu-central.insforge.app \
INSFORGE_API_KEY=ik_... \
node insforge/scripts/apply-schema.mjs

INSFORGE_BASE_URL=... INSFORGE_API_KEY=ik_... node insforge/scripts/deploy-functions.mjs

# Deploy the web app to InsForge Sites
node insforge/scripts/deploy-site.mjs

# Chrome extension: chrome://extensions → Developer mode → Load unpacked → ./extension
```

## Configuration (InsForge project secrets)

| Secret | Purpose | Status |
|---|---|---|
| `SERVICE_API_KEY` | service-role DB access for webhooks (`creem-webhook`, `track-signup`, `deploy-sync`) | ✅ set |
| `COMPOSIO_API_KEY` | Composio managed OAuth + tool execution | ✅ set |
| `DEPLOY_SYNC_TOKEN` | authenticates CI deploy-sync webhooks | ✅ set |
| `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_PRODUCT_STARTER`, `CREEM_PRODUCT_GROWTH` | Creem billing | ⬜ add when the Creem account is ready |
| `OPENHANDS_API_KEY` (+ optional `OPENHANDS_BASE_URL`) | real OpenHands sandbox execution for delivery runs | ⬜ add to switch delivery from gateway mode |
| `SEERIST_MODEL` | override the default model (`openai/gpt-4o-mini`) | optional |

## Compliance stance (non-negotiable)

- **No scripted or automated submission** against any freelance platform, in any phase. The extension autofills; the human clicks Submit.
- **Zero automated reads** of Upwork at launch — ingestion is 100% extension-capture of pages the user is already viewing.
- **Human-in-the-loop by default** across scoring, drafting, delivery QA, growth drafts, and every CEO-persona action outside its explicit allow-list.
- **Full auditability** — every AI action lands in `persona_action_log`; every proposal keeps its `proposal_status_history`; every delivery run stores its trace.
