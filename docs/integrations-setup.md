# Seerist — Integration setup guide

What's already live, and exactly what to add when you're ready. All secrets are
InsForge **project secrets** (Dashboard → Secrets, or `npx @insforge/cli secrets add`).
Edge functions read them via `Deno.env.get(...)` — nothing sensitive ships to the browser.

## Already configured ✅

| Secret | Purpose |
|---|---|
| `SERVICE_API_KEY` | Service-role DB access for `creem-webhook`, `track-signup`, CI `deploy-sync` |
| `COMPOSIO_API_KEY` | Composio managed OAuth + tool execution |
| `DEPLOY_SYNC_TOKEN` | Authenticates CI deploy-sync webhook calls |
| `CREEM_API_KEY` | Creem live API key — checkout sessions and billing-portal links |
| `CREEM_WEBHOOK_SECRET` | HMAC-SHA256 secret used to verify every `creem-signature` header |

## Creem (billing — Merchant of Record) ✅

Live and verified. Creem is the legal seller: it collects payment, registers and
remits VAT/GST/sales tax in 190+ countries, and absorbs chargeback liability.

**Webhook endpoint** registered in Creem → Developers → Webhooks:

```
https://si9f4zab.eu-central.insforge.app/functions/creem-webhook
```

This must be the **edge function** URL. `app.seerist.xyz` is a static site on
InsForge Sites with no `/api/*` routes, so any webhook pointed there returns 404
and Creem retries forever (30s → 1m → 5m → 1h) without ever granting access.

**Product ids are NOT environment variables.** The plan ladder lives in the
`billing_plans` table (`code`, `price_cents`, `interval`, `creem_product_id`,
`features`, `limits`), so pricing is data you can edit without a deploy:

| Plan | Monthly | Yearly (2 months free) |
|---|---|---|
| Free | $0 — no Creem product | — |
| Starter | `prod_64FkTYg19BehXAxxZ3Rnvz` | `prod_42NNzZ5QMttfLm6owbUztY` |
| Builder | `prod_1KbeN1XPs0TcPckX3RySlZ` | `prod_3kIuVm748zlejuW4m4iltY` |
| Scale | `prod_5z8aZK2jL7iNxeYGdluJl9` | `prod_6pgwtkJgYGEINzwWoODcG2` |

Access follows Creem's own guidance: granted on `subscription.active`, `paid`
and `trialing`; revoked on `expired` and `paused`; a `scheduled_cancel` keeps
access until the period ends. Signatures are compared in constant time and an
unsigned or wrongly-signed request is rejected with 401.

To run against the sandbox instead, set `CREEM_BASE_URL=https://test-api.creem.io`
and swap in a `creem_test_` key — the function also infers the base URL from the
key prefix on its own.

### Rotating the webhook secret

Update the secret in Creem, then update the InsForge project secret to match:

```bash
curl -X PUT "$INSFORGE_BASE_URL/api/secrets/CREEM_WEBHOOK_SECRET" \
  -H "Authorization: Bearer $INSFORGE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"value":"whsec_..."}'
```

No redeploy is needed — functions read the secret at invocation time.

## InsForge partnership — provisioning client backends ⬜

Seerist's own backend is one InsForge project. **Separately**, when a won
contract is delivered on the InsForge stack, `delivery-stack` provisions a
*second, different* InsForge project for the client, so The Builder writes code
against a live backend instead of a placeholder.

We use the **co-branded** model, not white-label, on purpose. Co-branded means:

- the client is a real InsForge user, linked by their own email;
- they can sign in to InsForge and manage the project themselves;
- they pay InsForge directly under their own plan.

That is the honest shape for delivered client work — you hand over a backend the
client controls, rather than reselling infrastructure or holding their data
behind your account. White-label hides InsForge entirely and puts the bill on
Seerist; that is a different commercial agreement and is deliberately not built.

**To enable it:**

1. Email <partnerships@insforge.dev> and ask for a **co-branded** partnership.
2. On approval you get a Partner ID and a Secret Key.
3. Add them as project secrets: `INSFORGE_PARTNER_ID`, `INSFORGE_PARTNER_SECRET`.
   (Optionally `INSFORGE_PARTNER_BASE_URL`; it defaults to `https://api.insforge.dev`.)

Until those exist every operation returns HTTP 501 with the exact next step, and
delivery still works — The Builder writes InsForge code, you just create the
client's project by hand.

**How it behaves once configured** (Delivery → open a run → *Client backend*):

| Operation | What happens |
|---|---|
| `provision` | `connect-user` with the owner's email, then `sync-project`; stores the project id, host, region and owner on the run |
| `attach` | For when the client's plan is at its project limit — pick one of the `candidate_projects` InsForge returns instead of failing |
| `credentials` | Reads the API key **live** from InsForge for handoff and writes an audit line. The key is never stored in Seerist |
| `refresh` | Re-reads the project's current status |

Leave the email blank and the project lands under your own InsForge account;
enter the client's and they own and pay for it from day one. Only the InsForge
stack is provisioned — an `instantdb` run is refused with a clear message rather
than half-provisioned.

Docs: <https://docs.insforge.dev/partnership>

## OpenHands (delivery sandbox) ⬜

- **Cloud**: get an API key from [OpenHands Cloud](https://app.all-hands.dev) and add
  `OPENHANDS_API_KEY`.
- **Self-hosted**: run the Agent Server (Docker) and add `OPENHANDS_BASE_URL` +
  `OPENHANDS_API_KEY`.
- With the key set, `trigger-delivery-run` starts a real sandboxed conversation and
  stores its id + trace. Without it, tasks execute through the model gateway with
  the same mandatory human-QA gate (fully functional fallback).

## Composio (Slack / Gmail / Calendar / CRM / Drive / Notion / Telegram / Discord)

The API key is set. Each service still needs an **auth config** (an OAuth app) in the
[Composio dashboard](https://app.composio.dev) — start these early; third-party OAuth
verification can take days to weeks:

1. Composio dashboard → Auth Configs → create one per toolkit (slack, gmail,
   googlecalendar, googledrive, notion, hubspot, telegram, discord).
2. In Seerist → Settings → Integrations, click **Connect <service>** — it opens the
   managed-OAuth flow and the account lands in Composio.
3. The Closer can then really send Gmail; `composio-integrations` `send_alert` can
   post to Slack/Telegram/Discord.

Not routed through Composio (by design): **Creem** (native integration) and
**GitHub/GitLab** (OpenHands native) — one integration path per service.

## Upwork developer API (parallel, non-blocking track)

Apply at the [Upwork developers portal](https://developers.upwork.com) now (~2-week
lead time). When granted:
1. Store credentials on the workspace's `platform_connections` row and set
   `status: 'active'`.
2. Build the polling worker to insert through `capture-job` with
   `source: 'api_poll'` — the JobSource seam is already in place.
3. **Confirm proposal-API scope directly from Upwork's current reference first** —
   independent operator sources indicate no public mutation exists for submitting
   proposals (read/manage only). Submission stays human-click regardless.

## Chrome Web Store (extension distribution)

The extension runs today via `chrome://extensions` → Load unpacked → `extension/`.
For public distribution: create a Chrome Web Store developer account ($5 one-time),
zip `extension/`, and submit. No code changes needed.

## Job intake by email (Module A discovery)

Each workspace has an intake address, `jobs+<intake_token>@inbound.seerist.xyz`,
shown in Settings → Automation. Point your mail provider's inbound webhook at:

```
POST https://si9f4zab.eu-central.insforge.app/functions/ingest-job-email?token=<INTAKE_WEBHOOK_TOKEN>
Content-Type: application/json

{ "to": "jobs+<token>@inbound.seerist.xyz", "from": "...", "subject": "...", "text": "...", "html": "..." }
```

Routing is by the address token only — a `From` header is trivially forged.
The `INTAKE_WEBHOOK_TOKEN` project secret is already set; read it from the
InsForge dashboard when configuring the provider. Until a provider is wired up,
the same function accepts a signed-in paste from Settings → Automation, which
is enough to try it.

## Scheduled automation

`node insforge/scripts/apply-schedules.mjs` registers five cron schedules and is
safe to re-run (existing ones are updated, not duplicated). `--list` shows what
is registered, `--delete` removes them. They authenticate with the
`AUTOMATION_TOKEN` project secret, already set.

| Schedule | Cron | Target |
| --- | --- | --- |
| `seerist-scan` | `*/15 * * * *` | `automation-tick?job=scan` |
| `seerist-nudge` | `17 9 * * *` | `automation-tick?job=nudge` |
| `seerist-stale` | `31 9 * * *` | `automation-tick?job=stale` |
| `seerist-digest` | `23 8 * * 1` | `pm-insights` |
| `seerist-grower` | `41 8 * * 1` | `growth-feedback` |

## CI deploy-sync webhook (Module C)

`.github/workflows/deploy-sync.yml` fires this on every push to `main` that
touches the code or API surface (`insforge/functions`, `insforge/schema.sql`,
`web/src`, `extension`, `docs`). It diffs the deploy against the previous
commit and posts the result. Two repository settings turn it on — until both
are present the workflow logs a notice and skips, so it never fails a build:

| Where | Name | Value |
| --- | --- | --- |
| Settings → Secrets → Actions | `DEPLOY_SYNC_TOKEN` | must equal the InsForge project secret of the same name |
| Settings → Variables → Actions | `DEPLOY_SYNC_WORKSPACE_ID` | the workspace whose docs/site the drafts are for |
| Settings → Variables → Actions | `INSFORGE_URL` | optional; defaults to the live project URL |

Run it by hand from the Actions tab ("Deploy sync" → Run workflow) to draft
against an arbitrary base commit.

Any other pipeline can call it directly:

```
POST https://si9f4zab.eu-central.insforge.app/functions/deploy-sync?token=<DEPLOY_SYNC_TOKEN>
Content-Type: application/json

{ "workspace_id": "<ws-uuid>", "deploy_ref": "v1.2.3", "change_summary": "…or a diff…" }
```

Docs + site drafts appear in Growth → Deploy sync, always as drafts.
