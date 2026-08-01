# Seerist — Product Specification

**Full-scope rebuild — July 30, 2026**

---

## 1. Vision

Seerist is a web platform that helps agencies and SaaS companies win freelance/services work safely, deliver it with AI-assisted execution on an agent-optimized tech stack, grow continuously between contracts, and run day-to-day operations through a full roster of named AI employees — all built together as one product, not staged behind feature gates.

For SaaS companies specifically, every bid is also a brand touchpoint. Three outcomes from one action, by design:
1. Client hires the company for services → revenue.
2. Client doesn't hire, but signs up for the product anyway → still a win.
3. Neither happens, but the product got seen by someone who needed it → brand awareness, at zero ad spend.

Two things in this spec are permanent design principles, not features on a roadmap, and they don't get "unlocked" later: no automated proposal submission that bypasses a human click on any platform, ever, without that platform's explicit authorization; and the AI CEO persona never acts alone on money, contracts, or deletions. Both are explained in place, below, rather than buried — everything else in this document is fully in scope, built together, no deferrals.

---

## 2. Problem statement

- Freelance-platform bidding is slow, manual, and inconsistent — good-fit jobs get lost simply by replying late or writing generic proposals.
- Existing bidding tools (GigRadar, Vollna) solve speed and drafting, but treat every bidder as a pure services business — none are built for a SaaS company using freelance platforms as an acquisition channel.
- Once work is won, there's no connective tissue between "we got the contract" and "the work gets delivered" — that's a separate, manual process today, and AI-built deliverables are only as reliable as the stack they're built on.
- "AI employee" products (Marblism, Sintra) solve general SMB busywork but have nothing bidding- or delivery-specific, and are closed-source SaaS with no code to build on.
- "Always-on growth agent" products (Ploy.ai) solve continuous website/marketing growth but are unrelated to services delivery, and are also closed-source.
- Nobody combines compliant bidding, error-resistant AI delivery, continuous growth, and a full persona-driven workforce in one product for both agencies and SaaS companies.

---

## 3. Users and tenancy model

### Persona A — Agency workspace
A services business (dev shop, design studio, marketing agency, consultancy) bidding on freelance-platform work as its core revenue model. No product to promote — wants speed, fit, and win-rate.

### Persona B — SaaS workspace
A SaaS company using freelance platforms as a growth channel. Wants every bid to either win the contract, drive a product signup, or at minimum create brand awareness, without diverting the core team from building product.

Both personas share the bidding and delivery modules. Persona B additionally uses the Growth module and gets product-aware drafting logic; Persona A does not.

### Tenancy model

One user identity (email) can belong to multiple organizations. Each organization can contain multiple workspaces (e.g., separate teams or brands under one company). Membership is a join table at both levels, each carrying a role — not a foreign key on the user — which is what lets the same email sit in several orgs and several workspaces per org with different permissions in each:

```
User (email, global identity)
  └─ Organization membership (role) ─→ Organization
                                          └─ Workspace membership (role) ─→ Workspace
                                                                              (type: agency | saas)
```

Everything else in this spec (jobs, proposals, delivery runs, personas) hangs off `workspace_id`, and org-level features (billing, the CEO persona) hang off `organization_id`.

---

## 4. Product modules — all built together

### Module A — Bid & Proposal Engine
*Inspired by GigRadar and Vollna; rebuilt compliance-first; multi-platform from day one.*

**Core loop:** user browses a freelance platform normally → captures a job via the extension → AI scoring → AI draft → human review → manual submit via the same extension.

**Ingestion — extension-capture, plus API polling where available, built together.** The primary mechanism is the Chrome extension reading the currently-open job posting page (title, description, budget, client stats) on an explicit user click — this requires no platform API and works identically across every supported platform, which is what makes multi-platform support achievable without waiting on each platform's developer-access process. Alongside it, a `JobSource` interface supports API-based polling per platform (`UpworkJobSource`, and equivalents for others as their APIs are reviewed) — fully built and code-complete, activating automatically once that platform's developer credentials are approved. Both paths feed the same pipeline; extension-capture never gets removed once API access exists, since it remains the fallback and the only mechanism for platforms with no usable public API.

- **Multi-platform support, built together:** Upwork, Fiverr, Freelancer.com, and Toptal all get an extension adapter (platform-specific page selectors) and a `policy_config` entry for mention/link rules. Each platform's specific link-and-solicitation policy still needs to be read and entered into `policy_configs` individually — that's a data/configuration task done alongside launch, not an engineering gate on the feature.
- Filters: keywords, budget range, client payment-verification status, client hire rate, job type.
- AI fit-scoring against the workspace's ideal-client profile, with a plain-language "why this fits" explanation — never just a number.
- AI draft generation:
  - Agency workspace: tone/style matched to workspace profile, referencing relevant past work.
  - SaaS workspace: same, plus product-mention logic driven by `policy_config` (link allowed / description-only / no mention) per platform — never auto-inferred from scraped policy text, defaults to "no mention" if unconfigured.
- Review queue (Kanban): New → Scored → Drafted → Needs edits → Approved → Submitted.
- Submission: the extension autofills the platform's proposal editor for an approved draft. **The human clicks submit. This is permanent, not a v0.1 limitation** — see the note in §1 and the fuller explanation below.
- Analytics: sent / viewed / replied / won, per platform; SaaS workspaces additionally get a "product mentioned" flag, tracked separately from win rate.
- Compliance guardrails: explicit risk disclosure before enabling bidding automation on any platform, an emergency kill-switch per platform if a policy change is detected.

**On automated submission specifically:** the full code path for an authorized-partnership submission mode is built — an interface that, given a platform's official Business-Manager-style API relationship (the model GigRadar operates under with Upwork), would submit through that authorized channel rather than a human click. It ships built and ready. It stays inactive until Seerist has that explicit relationship with a given platform, because submitting through a scripted click on a user's own session is what gets accounts permanently banned — this is a real, well-documented enforcement pattern, not a hypothetical risk. Nothing here is unbuilt; the activation switch is external, the same way `UpworkJobSource` activates once a developer key is approved.

---

### Module B — Delivery Engine
*Built on OpenHands (execution) and Hermes Agent (memory/learning). Not Grok Build, not OpenWorker — both are wrong-shaped infrastructure for this, not deferred features (see §5).*

**Core loop:** contract won → task decomposition → sandboxed agent execution → human QA → client handoff.

- Triggered when a proposal's status changes to "won."
- Work is decomposed into tasks and run inside OpenHands' sandboxed agent environment — file edits, code execution, browser access, contained per task.
- Hermes Agent holds the persistent per-workspace memory layer: client preferences, prior decisions, style/brand guidance, the default delivery-stack rule (below), and a growing library of reusable skills extracted from completed delivery runs.
- Mandatory human QA checkpoint before any deliverable is marked ready for the client — implemented natively.
- Deliverable packaging to the client's preferred channel: Drive, GitHub/GitLab (via OpenHands' native integration), or direct download.
- Full task-run trace stored for audit and dispute resolution.
- **Default delivery stack — agent-optimized, to reduce build errors.** Unless a won job explicitly requires a different stack, OpenHands defaults new client deliverables to InstantDB or InsForge:
  - **InstantDB** for client-heavy, real-time deliverables (dashboards, collaborative tools, chat-like features) — typed schema and sync/presence/offline abstractions reduce the error surface for AI-generated code, plus built-in undo for destructive schema changes.
  - **InsForge** for deliverables needing a fuller server-side stack (auth, storage, edge functions).
  - Lives in the Hermes memory layer for consistent application, always overridable per job — never forced onto a client with their own stack requirement.

---

### Module C — Growth Engine
*Directly inspired by Ploy.ai's full three-engine architecture (Web / Grow / Ads / Ploybooks); rebuilt from scratch, since Ploy is closed-source with nothing to fork. Built in full, not scoped down.*

- **Site & product ingestion** — pulls in the SaaS workspace's site, docs, and positioning, grounding Module A's product-mention drafting.
- **Signal loop from bidding to growth** — every bid where the product is mentioned becomes a tracked touchpoint; signups get attributed back to specific bids.
- **Autonomous site generation and maintenance** — ingests an existing site, reconstructs its design system, generates and maintains optimized pages with schema markup and metadata, continuously monitors performance and competitors, and proposes/drafts fixes. Publishing follows the same rule as everything else in §6: drafted and staged, human-approved before going live.
- **Ad creative generation and campaign management** — generates ad creative, manages campaigns, and provides full-funnel attribution back through the same touchpoint model used for bid-driven signups.
- **Visitor intent and identification** — identifies and scores intent from site visitors for outreach and CRM sync. This category (sometimes called visitor de-anonymization) carries real privacy-law obligations — GDPR/CCPA-style disclosure and consent requirements apply depending on where visitors are located, and this needs to be reflected in the workspace's own privacy policy and consent flow before the feature is enabled for a given site, not treated as a pure engineering task.
- **Full Ploybooks** — reusable, named growth strategies (SEO/AEO, ABM page generation, keyword optimization, and the bidding-specific strategies like "bid on jobs mentioning [competitor], lead with migration angle") that a workspace can save, customize, and reuse.
- **Deploy-triggered docs and site sync** — a CI/CD webhook fires on every production deploy; an LLM pipeline diffs the changed code/API surface against current developer docs and marketing site copy and drafts updates to both. Output is always a draft — a PR for docs, a staged preview for the site — **never auto-published**, per §6.

---

### Module D — AI Employees layer
*UX pattern from Marblism and Sintra — named personas, no shared code (both are closed-source). Full roster built together.*

Modules A–C are exposed through named, persistent personas rather than raw feature menus. Each persona is a thin, branded interface over the shared Hermes reasoning layer and Composio tool access, not a separate backend system.

| Persona | Owns | Built on |
|---|---|---|
| The Scout | Job capture assist & fit scoring, across all connected platforms | Module A |
| The Drafter | Proposal writing, product-mention logic | Module A + Composio (Notion/Docs) |
| The Builder | Delivery execution, incl. InstantDB/InsForge stack choice | Module B (OpenHands) |
| The Closer | Post-win client comms, scheduling | Composio (Gmail, Calendar) |
| The Grower | Full Growth Engine — site, ads, visitor intent, attribution | Module C |
| The PM | Synthesizes win/loss, QA-rejection, and attribution data into roadmap suggestions | Existing data only, no new backend |
| The CEO | Org-level orchestration across all personas | All modules, org-level scope |

**The CEO persona.** Operates at the organization level. The overwhelming majority of what a CEO persona does is fully autonomous, no approval needed: reprioritizing backlog items across every workspace, reallocating tasks between all other personas, adjusting workspace settings, directing The Scout/Grower/Drafter's strategy, surfacing cross-workspace insights, and orchestrating the other six personas end to end. The one boundary that stays: **money, external contractual commitments, deletion/archival of a workspace or organization, and externally-sent communications on the org's behalf always require one human click of approval.** This isn't a smaller version of the persona — it's the full persona, with one guardrail around the handful of actions that are financially or legally irreversible. Every autonomous action writes to a full audit log, and an org-level kill switch halts all CEO-persona activity immediately if needed.

---

## 5. Architecture

- **Backend/data:** InsForge — Postgres, auth, storage, realtime, edge functions, and its model gateway (used directly for all LLM calls — no separate LLM provider account needed). Seerist's own backend, distinct from what Module B builds for clients.
- **Delivery-engine target stack:** InstantDB and InsForge — see Module B. Default backends OpenHands scaffolds *client deliverables* onto.
- **Payments:** Creem (Merchant of Record) — not Stripe. Custom integration: an edge function creates Creem checkout sessions, a webhook handler processes Creem's subscription events against `organizations`' billing status.
- **Reasoning/memory:** Hermes Agent — persistent per-workspace memory, skill learning. Its native messaging connectors are unused; Composio owns that surface.
- **Execution:** OpenHands — sandboxed agent execution for delivery-phase work; native GitHub/GitLab integration.
- **Third-party tool access:** Composio — Slack/Telegram/Discord, Gmail, Calendar, CRM, Drive, Notion, LinkedIn/social, via managed OAuth. Not used for Creem or GitHub/GitLab, which have native paths.
- **Platform ingestion and submission:** Chrome extension, doing capture and autofill across all four supported platforms; API-based `JobSource` implementations per platform, activating as each platform's developer access is approved.
- **Data isolation:** InsForge project-level isolation by default; Turso-based per-tenant sharding available if job-feed write volume requires it at scale.
- **Infrastructure choices that are not "deferred features," just the wrong tools for this job:** Grok Build (local-first CLI, no multi-tenant web-service shape, and a recent, still largely unaudited data-handling incident — OpenHands fully covers the delivery-execution capability instead), OpenWorker (local Mac-only desktop app — its check-in-before-consequential-action pattern is fully implemented natively in Module B and the CEO persona, without taking the dependency), Keystroke.ai (source-available under a license restricting hosted-service use of its functionality by third parties — Composio fully covers the integration-layer capability instead; Keystroke remains an option for Seerist's own internal team automation only).

---

## 6. Non-functional requirements

- **Human-in-the-loop for platform-facing and consequential actions.** Every proposal submission requires a human click, on every platform, always — this is the one place in the product where "fully automated" is explicitly not the goal, because the cost of getting it wrong (permanent account bans) falls on the customer, not Seerist. The CEO persona's money/contract/deletion boundary follows the same logic.
- **Everything else is built to be as autonomous as it can safely be** — scoring, drafting, delivery execution, growth content generation, and the vast majority of CEO-persona actions all run without waiting on a human, with review/audit trails rather than approval gates, except where §'s above specify otherwise.
- **Error-resistant delivery** via the InstantDB/InsForge default stack, improving QA-rejection rate and delivery time.
- **Data isolation** per workspace and per organization.
- **Full auditability** — every AI-drafted proposal, delivery-engine task run, growth-content draft, and persona action is logged with a complete, retrievable trace.
- **Transparent risk and privacy disclosure** — plain-language disclosure of platform ban risk before enabling bidding automation, and of visitor-identification privacy obligations before enabling that Growth Engine feature.

---

## 7. Core data model (overview)

- `users`, `organizations`, `organization_memberships`, `workspaces` (type: agency | saas), `workspace_memberships`.
- `platform_connections` (workspace_id, platform, credentials, source_type: extension | api).
- `job_postings` (workspace_id, platform, source: extension_capture | api_poll), `proposals`, `proposal_status_history`.
- `policy_configs` (platform, mention_policy) — one row per supported platform, manually curated.
- `delivery_runs` (proposal_id, task list, target_stack: instantdb | insforge | client_specified, OpenHands trace).
- `growth_touchpoints` (proposal_id, product_mentioned, attributed_signup), `growth_content_drafts` (site/ad drafts pending approval), `visitor_intent_records` (with consent/jurisdiction metadata).
- `persona_action_log` (organization_id or workspace_id, persona, action, approved_by, timestamp) — the audit trail for every module, especially the CEO persona.

---

## 8. Integrations and prerequisites

| Tool | Prep needed |
|---|---|
| InsForge | Hosted project or self-hosted; CLI installed; project API key |
| Chrome extension | None for local dev; Web Store developer account when publishing |
| Creem | Account, API key, webhook endpoint configured |
| Upwork, Fiverr, Freelancer.com, Toptal developer APIs | Apply for each in parallel with the build (real lead time per platform); each activates its `JobSource` once approved — none block launch, since extension-capture covers every platform from day one |
| OpenHands | Self-hosted Agent Server (Docker) or OpenHands Cloud account |
| Hermes Agent | Self-hosted via installer; LLM access via InsForge gateway |
| InstantDB | Account/API key, provisioned per client delivery project |
| Composio | Account/API key, plus an OAuth app registered per connected service (Slack, Google Cloud project for Gmail/Calendar, HubSpot, LinkedIn, etc.) — start these early, third-party OAuth verification can take days to weeks |
| Turso | Only if job-feed write volume at scale requires per-tenant sharding |
| Ploy.ai / Marblism / Sintra | None — no code relationship |

---

## 9. Build sequence

This is a dependency order, not a feature-availability timeline — every module and persona above ships as part of one build, and nothing here means a feature is unavailable, only that some things need other things to exist first (you can't QA a delivery before OpenHands is wired up; you can't have a CEO persona orchestrate personas that don't exist yet).

1. Tenancy model, InsForge connection, Creem billing.
2. Bid & Proposal Engine (Module A) — extension capture/autofill across all four platforms, scoring, drafting, review queue, analytics; API-based `JobSource` per platform wired in as each developer key is approved.
3. Delivery Engine (Module B) — OpenHands, Hermes memory, InstantDB/InsForge default stack, human QA checkpoint.
4. Composio integration layer (CRM, calendar, Drive, Notion, alerts) and deploy-triggered docs/site sync.
5. Full Growth Engine (Module C) — site generation, ad management, visitor intent, full Ploybooks.
6. AI Employees layer (Module D) — all seven personas, including the CEO persona with its money/contract/deletion approval gate.

---

## 10. Success metrics

- **Module A:** proposals sent/week per platform, reply rate, win rate, time-to-submit, zero platform bans attributable to Seerist's own automation.
- **Module B:** % of won contracts delivered on time, human-QA rejection rate by target_stack, average time from win to delivery.
- **Module C:** signups attributed to bid touchpoints, site/ad-driven signups, cost per acquired customer vs. paid ads.
- **Module D:** persona engagement across all seven; zero CEO-persona actions outside its money/contract/deletion approval gate.

---

## 11. Open risks and questions

1. **Each platform's API read/write scope needs confirmation from its own primary developer documentation** before that platform's `JobSource` goes live — Upwork specifically has an unresolved ambiguity between its listed "Proposals" API category and third-party operator reports that no submission mutation exists publicly. Extension-capture is unaffected by this either way.
2. **Per-platform link/mention policy stays manually maintained, never auto-detected**, across all four platforms.
3. **Visitor-identification consent/disclosure requirements vary by jurisdiction** and need real legal review per workspace's target market before that Growth Engine feature is enabled for them.
4. **The CEO persona's exact list of "always requires approval" actions should get a final founder/legal read** before launch — the list in Module D is the working definition, not yet a legally reviewed one.
5. **InstantDB vs. InsForge decision rule (Module B) should be validated against real delivery runs** — a reasonable starting heuristic, not yet proven.
6. **GTM sequencing** (agency vs. SaaS workspaces first) is undecided and affects which module gets earliest polish.

---

## 12. Permanent boundaries (not deferrals)

- No automated or scripted proposal submission bypassing a human click, on any platform, without that platform's explicit authorization — the code path for an authorized mode exists and activates only with that authorization.
- The CEO persona never acts alone on money, contracts, or deletions — one human click, always, on those specifically.
- No dependency on Grok Build, OpenWorker, or Keystroke.ai as core infrastructure, for the technical/legal reasons in §5 — their capabilities are fully covered by OpenHands, native implementation, and Composio respectively.
