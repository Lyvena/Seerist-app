"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { signInWithEmail, verifyEmail } from "@/app/actions/auth"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [otp, setOtp] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await signInWithEmail(email, password)
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
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials")
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
      toast.success("Email verified. Please sign in.")
      setNeedsVerification(false)
      setOtp("")
    } catch (err: any) {
      toast.error(err.message || "Invalid code")
    } finally {
      setLoading(false)
    }
  }

  if (needsVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-secondary)] px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
              <Mail className="h-6 w-6 text-[var(--brand-primary)]" />
            </div>
            <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              We sent a 6-digit code to <strong>{email}</strong>
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
              disabled={loading}
              className="text-sm text-[var(--brand-primary)] hover:underline"
            >
              Resend code
            </button>
            <p className="text-sm text-[var(--text-muted)] text-center">
              After verifying, sign in with your email and password.
            </p>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-secondary)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Sign in to your Seerist account
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign in
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-muted)] text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[var(--brand-primary)] hover:underline font-medium">
              Sign up
            </Link>
          </p>
          <Link
            href="/forgot-password"
            className="text-sm text-[var(--brand-primary)] hover:underline text-center"
          >
            Forgot password?
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}