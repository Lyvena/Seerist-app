"use client"

import { useState } from "react"
import { ArrowLeft, Mail, KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OtpInput } from "@/components/auth/OtpInput"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  sendPasswordResetEmail,
  exchangeResetPasswordToken,
  resetPassword,
} from "@/app/actions/auth"
import { toast } from "sonner"

type Step = "request" | "code" | "reset" | "done"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("request")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Step 1 — request the reset code email.
  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await sendPasswordResetEmail(email)
      if (error) throw new Error(error.message)
      setStep("code")
      toast.success("Reset code sent", {
        description: "If an account exists, a 6-digit code is on its way.",
      })
    } catch (err) {
      // Don't reveal whether the email exists, but still advance the flow for
      // a good UX if the user simply typo'd — InsForge returns an error here
      // for unknown emails, which we surface generically.
      toast.error(err instanceof Error ? err.message : "Failed to send reset code")
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — exchange the 6-digit code for a one-time reset token.
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error("Please enter the full 6-digit code")
      return
    }
    setLoading(true)
    try {
      const { data, error } = await exchangeResetPasswordToken(email, otp)
      if (error) throw new Error(error.message)
      // data.token is the one-time reset token used in step 3.
      const token = (data as { token?: string } | null)?.token
      if (!token) throw new Error("Did not receive a reset token")
      setResetToken(token)
      setStep("reset")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired code")
    } finally {
      setLoading(false)
    }
  }

  // Step 3 — set the new password.
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match")
      return
    }
    setLoading(true)
    try {
      const { error } = await resetPassword(newPassword, resetToken)
      if (error) throw new Error(error.message)
      setStep("done")
      toast.success("Password reset successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  // ─── Done state ──────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--status-success-light)]">
          <CheckCircle2 className="h-6 w-6 text-[var(--status-success)]" />
        </div>
        <div>
          <h1 className="font-cal text-2xl font-semibold text-[var(--text-primary)]">Password reset</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Your password has been updated. You can now sign in with your new password.
          </p>
        </div>
        <Button size="lg" className="w-full" onClick={() => router.push("/login")}>
          Back to sign in
        </Button>
      </div>
    )
  }

  // ─── Step 3 — new password ───────────────────────────────────────────────
  if (step === "reset") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-light)]">
            <KeyRound className="h-6 w-6 text-[var(--brand-primary)]" />
          </div>
          <h1 className="font-cal text-2xl font-semibold text-[var(--text-primary)]">New password</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Choose a new password for your account.</p>
        </div>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmNewPassword">Confirm password</Label>
            <Input
              id="confirmNewPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Reset password
          </Button>
        </form>
      </div>
    )
  }

  // ─── Step 2 — enter code ─────────────────────────────────────────────────
  if (step === "code") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-light)]">
            <Mail className="h-6 w-6 text-[var(--brand-primary)]" />
          </div>
          <h1 className="font-cal text-2xl font-semibold text-[var(--text-primary)]">Enter the code</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            We sent a 6-digit code to <strong className="text-[var(--text-secondary)]">{email}</strong>
          </p>
        </div>
        <form onSubmit={handleVerifyCode} className="space-y-5">
          <OtpInput value={otp} onChange={setOtp} disabled={loading} autoFocus />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Verify code
          </Button>
        </form>
        <div className="flex flex-col gap-3 text-center">
          <button
            type="button"
            onClick={() => setStep("request")}
            className="inline-flex items-center justify-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" /> Use a different email
          </button>
        </div>
      </div>
    )
  }

  // ─── Step 1 — request code (default) ─────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-cal text-2xl font-semibold text-[var(--text-primary)]">Reset password</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Enter your email and we&apos;ll send you a 6-digit reset code.
        </p>
      </div>
      <form onSubmit={handleRequestCode} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Send reset code
        </Button>
      </form>
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </div>
  )
}
