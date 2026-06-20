"use client"

import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-secondary)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
          <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Contact support to reset your password, or sign up for a new account.
          </p>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-[var(--text-muted)]">
            If you need help, email us at{" "}
            <a href="mailto:support@seerist.xyz" className="text-[var(--brand-primary)] hover:underline">
              support@seerist.xyz
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}