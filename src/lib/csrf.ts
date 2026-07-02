import { NextResponse } from "next/server"

/**
 * Reject state-changing requests that don't originate from our own origin.
 * Next.js Server Actions get Origin validation for free; hand-written route
 * handlers do not. This blocks cross-site form POSTs (CSRF) that would
 * otherwise ride the session cookie.
 */
export function checkOrigin(request: Request): NextResponse | null {
  const allowed = process.env.NEXT_PUBLIC_APP_URL

  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")

  // Same-origin browser requests always send an Origin header on POSTs.
  // If neither Origin nor Referer is present, it's not a browser request —
  // allow (e.g. server-side fetches, edge functions, cron). Suby webhooks
  // are validated separately via HMAC signature.
  if (!origin && !referer) return null

  if (allowed) {
    const allowedOrigin = new URL(allowed).origin
    if (origin && new URL(origin).origin === allowedOrigin) return null
    if (referer && new URL(referer).origin === allowedOrigin) return null
  }

  return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 })
}
