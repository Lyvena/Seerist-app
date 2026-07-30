# Seerist — Build Complete (July 30, 2026)

The full Seerist platform is BUILT, DEPLOYED, and END-TO-END TESTED (36/36 checks passing against the live backend).

## Where everything lives

- **Live app:** https://si9f4zab.insforge.site (sign up with email — verification codes come from hello@seerist.xyz)
- **Code:** https://github.com/Lyvena/Seerist-app (monorepo: web/, extension/, insforge/, docs/)
- **Backend:** InsForge project cefd08b8-a1d1-428c-88ce-98601a5fbc07 — https://si9f4zab.eu-central.insforge.app (19 tables with row-level security, 19 edge functions, model gateway powering all AI)

## What was built (everything — no deferrals)

- **Tenancy first:** users → org memberships (role on join) → organizations → workspace memberships → workspaces (agency | saas). RLS-isolated per membership (verified: outsiders see zero rows).
- **Module A:** manual + extension capture, AI fit scoring (always with plain-language reasoning), policy-driven product-mention drafting (curated per-platform policy_configs; missing row = no mention), Kanban review queue (New→Scored→Drafted→Needs edits→Approved→Submitted), sent/viewed/replied/won analytics, risk disclosure gate + per-platform kill switch.
- **Module B:** won → AI task decomposition → execution (OpenHands sandbox when key added; model gateway meanwhile) → MANDATORY human QA (server-enforced) → packaged delivery; InstantDB-vs-InsForge stack rule in Hermes-style workspace memory; skill learning from completed runs.
- **Module C:** site ingestion grounding drafts, bid→signup attribution (public track-signup endpoint + ?seerist_ref=), Ploybooks, deploy-triggered docs/site sync (always drafts).
- **Module D:** all seven personas (Scout, Drafter, Builder, Closer, Grower, PM, CEO). CEO has bounded autonomy — server-enforced allow-list, approval queue for money/legal/external/destructive actions, full audit log, org kill switch.
- **Chrome extension:** capture on Upwork job pages + autofill of approved drafts (human clicks Submit — always), offline queue. Load via chrome://extensions → Load unpacked → extension/.
- **Billing:** Creem checkout + webhook functions live; they return clear setup guidance until Creem keys are added (see follow-up task).

## Keys still needed from you (see the follow-up task in your Tasks board)

Creem (CREEM_API_KEY, product ids, webhook secret) · OpenHands (OPENHANDS_API_KEY) · Composio auth configs per service (dashboard setup; API key already installed) · Upwork developer key application · Chrome Web Store account for public extension distribution.
