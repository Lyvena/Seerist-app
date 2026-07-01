"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Mail, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OtpInput } from "@/components/auth/OtpInput"
import Link from "next/link"
import { signInWithEmail, verifyEmail, resendVerificationEmail } from "@/app/actions/auth"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [otp, setOtp] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await signInWithEmail(email, password)
      if (error) {
        if (error.error === "AUTH_NEED_VERIFICATION") {
          setNeedsVerification(true)
          toast.success("Verification code sent to your email")
          return
        }
        throw error
      }
      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials")
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
      if (error) throw error
      toast.success("Welcome back!")
      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid code")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      const { error } = await resendVerificationEmail(email)
      if (error) throw error
      toast.success("New code sent to your email")
    } catch {
      toast.error("Failed to resend code")
    } finally {
      setResending(false)
    }
  }

  if (needsVerification) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-light)]">
            <Mail className="h-6 w-6 text-[var(--brand-primary)]" />
          </div>
          <h1 className="font-cal text-2xl font-semibold text-[var(--text-primary)]">Verify your email</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            We sent a 6-digit code to <strong className="text-[var(--text-secondary)]">{email}</strong>
          </p>
        </div>
        <form onSubmit={handleVerify} className="space-y-5">
          <OtpInput value={otp} onChange={setOtp} disabled={loading} autoFocus />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Verify &amp; sign in
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
            onClick={() => {
              setNeedsVerification(false)
              setOtp("")
            }}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-cal text-2xl font-semibold text-[var(--text-primary)]">Welcome back</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Sign in to your Seerist account
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-[var(--brand-primary)] hover:underline">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
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
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary-light)]/50 px-4 py-2.5 text-xs text-[var(--text-muted)]">
        <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
        Protected by email verification
      </div>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-[var(--brand-primary)] hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
