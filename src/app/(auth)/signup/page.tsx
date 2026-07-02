"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OtpInput } from "@/components/auth/OtpInput"
import Link from "next/link"
import { signUpWithEmail, verifyEmail, resendVerificationEmail } from "@/app/actions/auth"
import { toast } from "sonner"

export default function SignupPage() {
  const router = useRouter()
  // step is "signup" | "verify" when verification is required, or we go straight
  // to onboarding if the backend doesn't require verification.
  const [step, setStep] = useState<"signup" | "verify">("signup")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match")
      return
    }
    setLoading(true)
    try {
      const { data, error } = await signUpWithEmail(email, password)
      if (error) throw new Error(error.message)

      // Branch on the actual InsForge response. If verification is required,
      // stay on the same page and show the OTP input. Otherwise the account
      // is active immediately — go to onboarding.
      if (data?.requireEmailVerification) {
        setStep("verify")
        toast.success("Verification code sent to your email")
      } else if (data?.accessToken) {
        // No verification needed — session is established.
        toast.success("Account created!")
        router.push("/onboarding")
        router.refresh()
      } else {
        // No token and no verification flag — treat as needing verification.
        setStep("verify")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error("Please enter the full 6-digit code")
      return
    }
    setLoading(true)
    try {
      const { error } = await verifyEmail(email, otp)
      if (error) throw new Error(error.message)
      toast.success("Email verified successfully")
      // verifyEmail() auto-saves the session for the code flow.
      router.push("/onboarding")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      const { error } = await resendVerificationEmail(email)
      if (error) throw new Error(error.message)
      toast.success("New code sent to your email")
    } catch {
      toast.error("Failed to resend code")
    } finally {
      setResending(false)
    }
  }

  // ─── Verification step ───────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-light)]">
            <Mail className="h-6 w-6 text-[var(--brand-primary)]" />
          </div>
          <h1 className="font-cal text-2xl font-semibold text-[var(--text-primary)]">Check your email</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            We sent a 6-digit verification code to <strong className="text-[var(--text-secondary)]">{email}</strong>
          </p>
        </div>
        <form onSubmit={handleVerify} className="space-y-5">
          <OtpInput value={otp} onChange={setOtp} disabled={loading} autoFocus />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Verify &amp; continue
          </Button>
        </form>
        <div className="flex flex-col gap-3 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-[var(--brand-primary)] hover:underline disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
          <button
            type="button"
            onClick={() => setStep("signup")}
            className="inline-flex items-center justify-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign up
          </button>
        </div>
      </div>
    )
  }

  // ─── Sign-up form ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-cal text-2xl font-semibold text-[var(--text-primary)]">Create your account</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Get started with Seerist for free
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
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
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--brand-primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
