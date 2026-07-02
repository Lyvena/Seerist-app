"use server"

import { createServerClient, createAuthActions } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"

/**
 * Auth server actions — aligned with the actual InsForge Auth API.
 *
 * Live config (verified via `insforge metadata`):
 *   requireEmailVerification: true
 *   verifyEmailMethod:       "code"   (6-digit OTP)
 *   resetPasswordMethod:     "code"   (6-digit OTP)
 *   oAuthProviders:          []       (no OAuth)
 *   passwordMinLength:       6
 *
 * CRITICAL: session-creating flows (signIn, signUp, verifyEmail, signOut) MUST
 * go through `createAuthActions()`, which wraps them with cookie persistence.
 * Calling `createServerClient().auth.signInWithPassword()` directly does NOT
 * set the httpOnly session cookies, so the next request has no session and the
 * user bounces back to /login — appearing as "login doesn't work".
 */

// ─── Session-creating flows (use createAuthActions for cookie persistence) ──

export async function signInWithEmail(email: string, password: string) {
  const actions = createAuthActions({ cookies: await cookies() })
  const { data, error } = await actions.signInWithPassword({ email, password })

  // InsForge returns 403/FORBIDDEN when the account exists but the email
  // hasn't been verified yet. Surface a stable sentinel so the client can
  // branch into the verification UI without inspecting the raw error.
  if (error && error.statusCode === 403) {
    return {
      data: null,
      error: { message: error.message, needsVerification: true, statusCode: 403 },
    }
  }

  return { data, error: error ? { message: error.message, needsVerification: false } : null }
}

export async function signUpWithEmail(email: string, password: string, name?: string) {
  const actions = createAuthActions({ cookies: await cookies() })
  const { data, error } = await actions.signUp({
    email,
    password,
    ...(name ? { name } : {}),
  })

  if (error) {
    return { data: null, error: { message: error.message } }
  }
  // data.requireEmailVerification tells us whether the code/OTP step is needed.
  return { data, error: null }
}

// verifyEmail() auto-saves the session on success — no separate sign-in call.
export async function verifyEmail(email: string, otp: string) {
  const actions = createAuthActions({ cookies: await cookies() })
  const { data, error } = await actions.verifyEmail({ email, otp })
  if (error) {
    return { data: null, error: { message: error.message } }
  }
  return { data, error: null }
}

export async function signOutAction() {
  const actions = createAuthActions({ cookies: await cookies() })
  const { error } = await actions.signOut()
  if (error) return { error: { message: error.message } }
  return { error: null }
}

// ─── Non-session flows (no cookie persistence needed) ──────────────────────

export async function resendVerificationEmail(email: string) {
  const insforge = createServerClient({ cookies: await cookies() })
  const { error } = await insforge.auth.resendVerificationEmail({ email })
  if (error) return { error: { message: error.message } }
  return { error: null }
}

// ─── Password reset: 3-step code flow ──────────────────────────────────────

// Step 1 — send the reset code email.
export async function sendPasswordResetEmail(email: string) {
  const insforge = createServerClient({ cookies: await cookies() })
  const { error } = await insforge.auth.sendResetPasswordEmail({ email })
  if (error) return { error: { message: error.message } }
  return { error: null }
}

// Step 2 — exchange the 6-digit code for a one-time reset token.
export async function exchangeResetPasswordToken(email: string, code: string) {
  const insforge = createServerClient({ cookies: await cookies() })
  const { data, error } = await insforge.auth.exchangeResetPasswordToken({ email, code })
  if (error) return { data: null, error: { message: error.message } }
  return { data, error: null }
}

// Step 3 — set the new password using the token from step 2.
export async function resetPassword(newPassword: string, otp: string) {
  const insforge = createServerClient({ cookies: await cookies() })
  const { data, error } = await insforge.auth.resetPassword({ newPassword, otp })
  if (error) return { data: null, error: { message: error.message } }
  return { data, error: null }
}
