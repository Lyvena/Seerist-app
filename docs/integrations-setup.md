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

## CI deploy-sync webhook (Module C)

Point your product's deploy pipeline at:

```
POST https://si9f4zab.eu-central.insforge.app/functions/deploy-sync?token=<DEPLOY_SYNC_TOKEN>
Content-Type: application/json

{ "workspace_id": "<ws-uuid>", "deploy_ref": "v1.2.3", "change_summary": "…or a diff…" }
```

Docs + site drafts appear in Growth → Deploy sync, always as drafts.
