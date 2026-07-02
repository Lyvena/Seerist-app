"use server"

import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

/**
 * Auth server actions.
 *
 * Live InsForge auth config for this project (verified via `insforge metadata`):
 *   requireEmailVerification: true
 *   verifyEmailMethod:       "code"   (6-digit OTP)
 *   resetPasswordMethod:     "code"   (6-digit OTP)
 *   oAuthProviders:          []       (no OAuth configured)
 *   passwordMinLength:       6
 *
 * All flows below match that config.
 */

// ─── Sign in ──────────────────────────────────────────────────────────────
export async function signInWithEmail(email: string, password: string) {
  const insforge = createServerClient({ cookies: await cookies() })
  const { data, error } = await insforge.auth.signInWithPassword({ email, password })

  // InsForge returns a 403/FORBIDDEN when the account exists but the email
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

// ─── Sign up ──────────────────────────────────────────────────────────────
export async function signUpWithEmail(email: string, password: string, name?: string) {
  const insforge = createServerClient({ cookies: await cookies() })
  const { data, error } = await insforge.auth.signUp({
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

// ─── Verify email (code method) ───────────────────────────────────────────
// verifyEmail() auto-saves the session on success — no separate sign-in call.
export async function verifyEmail(email: string, otp: string) {
  const insforge = createServerClient({ cookies: await cookies() })
  const { data, error } = await insforge.auth.verifyEmail({ email, otp })
  if (error) {
    return { data: null, error: { message: error.message } }
  }
  return { data, error: null }
}

// ─── Resend verification email ────────────────────────────────────────────
export async function resendVerificationEmail(email: string) {
  const insforge = createServerClient({ cookies: await cookies() })
  const { error } = await insforge.auth.resendVerificationEmail({ email })
  if (error) return { error: { message: error.message } }
  return { error: null }
}

// ─── Password reset: 3-step code flow ─────────────────────────────────────

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

// ─── Sign out ─────────────────────────────────────────────────────────────
export async function signOutAction() {
  const insforge = createServerClient({ cookies: await cookies() })
  const { error } = await insforge.auth.signOut()
  if (error) return { error: { message: error.message } }
  return { error: null }
}
