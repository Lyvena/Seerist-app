"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

/**
 * Landing page for InsForge link-based auth redirects (email verification and
 * password reset links). The project is currently configured for the *code*
 * method, so this mostly forwards to the dashboard. If the method is ever
 * switched to *link*, this handles the redirect query params:
 *
 *   insforge_status=success & insforge_type=verify_email → "verified, sign in"
 *   insforge_status=ready   & insforge_type=reset_password & token=… → reset page
 *   insforge_status=error   → show the error
 */
function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const insforgeStatus = params.get("insforge_status")
    const insforgeType = params.get("insforge_type")
    const insforgeError = params.get("insforge_error")
    const token = params.get("token")

    // No InsForge redirect params — standard post-auth/OAuth callback.
    if (!insforgeStatus && !token) {
      router.replace("/dashboard")
      return
    }

    if (insforgeStatus === "success" && insforgeType === "verify_email") {
      setStatus("success")
      setMessage("Your email has been verified. You can now sign in.")
      return
    }

    if (insforgeStatus === "ready" && insforgeType === "reset_password" && token) {
      // Hand off to the dedicated reset-password page which consumes the token.
      router.replace(`/reset-password?token=${encodeURIComponent(token)}`)
      return
    }

    if (insforgeStatus === "error") {
      setStatus("error")
      setMessage(insforgeError || "The link is invalid or has expired.")
      return
    }

    // Fallback — go to the dashboard.
    router.replace("/dashboard")
  }, [params, router])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div
        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
          status === "success"
            ? "bg-[var(--status-success-light)]"
            : "bg-[var(--status-danger-light)]"
        }`}
      >
        {status === "success" ? (
          <CheckCircle2 className="h-6 w-6 text-[var(--status-success)]" />
        ) : (
          <XCircle className="h-6 w-6 text-[var(--status-danger)]" />
        )}
      </div>
      <h1 className="font-cal text-2xl font-semibold text-[var(--text-primary)]">
        {status === "success" ? "Email verified" : "Something went wrong"}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">{message}</p>
      <button
        onClick={() => router.push(status === "success" ? "/login" : "/")}
        className="mt-6 rounded-lg bg-[var(--brand-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)]"
      >
        {status === "success" ? "Continue to sign in" : "Go home"}
      </button>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}
