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

## Creem (billing — Merchant of Record) ⬜

1. Create products for each plan in the [Creem dashboard](https://creem.io).
2. Add secrets:
   - `CREEM_API_KEY` — from Creem → Developers
   - `CREEM_PRODUCT_STARTER`, `CREEM_PRODUCT_GROWTH` — product ids
   - `CREEM_WEBHOOK_SECRET` — after step 3
   - (test mode: also set `CREEM_BASE_URL=https://test-api.creem.io`)
3. Register the webhook in Creem → Developers → Webhooks:
   `https://si9f4zab.eu-central.insforge.app/functions/creem-webhook`
4. Done — `creem-checkout` starts returning real checkout URLs, and subscription
   events update `organizations.billing_status` automatically. Until then the
   Settings page shows a clear "setup needed" message (HTTP 501), by design.

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
