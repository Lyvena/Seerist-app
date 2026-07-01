"use client"

import { useState } from "react"
import { ArrowLeft, Mail, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Note: this is a client-side call to the SDK; the server action pattern
      // would require a dedicated action, but sendResetPasswordEmail is safe to
      // call here since it only triggers an email to the given address.
      const { createClient } = await import("@insforge/sdk")
      const client = createClient({
        baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
        anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
      })
      const { error } = await (client.auth as unknown as {
        sendResetPasswordEmail: (args: { email: string }) => Promise<{ error: unknown }>
      }).sendResetPasswordEmail({ email })
      if (error) throw error
      setSent(true)
      toast.success("Reset code sent if an account exists")
    } catch {
      // Don't reveal whether the email exists
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--status-success-light)]">
          <Mail className="h-6 w-6 text-[var(--status-success)]" />
        </div>
        <div>
          <h1 className="font-cal text-2xl font-semibold text-[var(--text-primary)]">Check your email</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            If an account exists for <strong className="text-[var(--text-secondary)]">{email}</strong>,
            you&apos;ll receive a reset code shortly.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-[var(--brand-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-cal text-2xl font-semibold text-[var(--text-primary)]">Reset password</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Enter your email and we&apos;ll send you a reset code.
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
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          <Send className="h-4 w-4" />
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
