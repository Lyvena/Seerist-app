"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { signUpWithEmail, verifyEmail } from "@/app/actions/auth"
import { toast } from "sonner"

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<"signup" | "verify">("signup")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error("Passwords don't match")
      return
    }
    setLoading(true)
    try {
      const { data, error } = await signUpWithEmail(email, password)
      if (error) throw error
      if (data?.requireEmailVerification) {
        setStep("verify")
        toast.success("Verification code sent to your email")
      } else {
        router.push("/onboarding")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error("Please enter the full 6-digit code")
      return
    }
    setLoading(true)
    try {
      const { data, error } = await verifyEmail(email, otp)
      if (error) throw error
      toast.success("Email verified successfully")
      router.push("/onboarding")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Invalid code")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      const { error } = await signUpWithEmail(email, password)
      if (error) throw error
      toast.success("New code sent to your email")
    } catch (err: any) {
      toast.error(err.message || "Failed to resend code")
    } finally {
      setLoading(false)
    }
  }

  if (step === "verify") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-secondary)] px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
              <Mail className="h-6 w-6 text-[var(--brand-primary)]" />
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              We sent a 6-digit verification code to <strong>{email}</strong>
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  disabled={loading}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify email
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="text-sm text-[var(--brand-primary)] hover:underline"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => setStep("signup")}
              className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign up
            </button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-secondary)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Get started with Seerist for free
          </p>
        </CardHeader>
        <CardContent>
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
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  onClick={() => setShowPassword(!showPassword)}
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create account
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-[var(--text-muted)] text-center w-full">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--brand-primary)] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}