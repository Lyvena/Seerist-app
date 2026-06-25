"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CreditCard, Download, ExternalLink, ShieldAlert,
  ArrowRight, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { PLAN_NAMES, type PlanTier } from "@/lib/plan-limits"
import { toast } from "sonner"

interface Props {
  plan: string
  planName: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  paymentProviderId: string | null
  usage: { opportunities: number; proposals: number; products: number; platforms: number }
  limits: { opportunities: number; proposals: number; products: number; platforms: number }
  invoices: Array<{ id: string; date: string; amount: number; status: string; url: string | null }>
}

export default function BillingClient({
  plan, planName, status, currentPeriodEnd, cancelAtPeriodEnd,
  paymentProviderId, usage, limits, invoices,
}: Props) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)

  const isFree = plan === "free"
  const isActive = status === "active"

  function formatDate(date: string | null) {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel your subscription? You'll lose access to paid features at the end of the billing period.")) return
    setCancelling(true)
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "free", annual: false }),
      })
      if (res.ok) {
        toast.success("Subscription cancelled")
        router.refresh()
      } else {
        toast.error("Failed to cancel subscription")
      }
    } catch {
      toast.error("Failed to cancel subscription")
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Billing" subtitle="Manage your subscription and payment details" />

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Current Plan</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{planName}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {isFree ? (
                "Free forever — no payment needed"
              ) : cancelAtPeriodEnd ? (
                <>Cancels on {formatDate(currentPeriodEnd)}</>
              ) : (
                <>Renews on {formatDate(currentPeriodEnd)}</>
              )}
            </p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isActive ? "bg-[var(--status-success)]/10 text-[var(--status-success)]" : "bg-[var(--status-warning)]/10 text-[var(--status-warning)]"
          }`}>
            {status}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isFree ? (
            <Button variant="default" onClick={() => router.push("/settings/billing?upgrade=pro")}>
              Upgrade Plan <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button variant="default" onClick={() => router.push("/settings/billing?upgrade=change")}>
                Change Plan <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              {paymentProviderId && (
                <Button variant="outline" onClick={() => toast.info("Customer portal coming soon with Paddle integration")}>
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Manage Subscription
                </Button>
              )}
              <Button variant="ghost" className="text-[var(--status-error)]" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Cancelling..." : "Cancel Subscription"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <CreditCard className="h-4 w-4" />
          Usage This Period
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <UsageBar label="Opportunities" used={usage.opportunities} limit={limits.opportunities} />
          <UsageBar label="AI Proposals" used={usage.proposals} limit={limits.proposals} />
          <UsageBar label="Products" used={usage.products} limit={limits.products} />
          <UsageBar label="Platforms" used={usage.platforms} limit={limits.platforms} />
        </div>
      </div>

      {invoices.length > 0 && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Download className="h-4 w-4" />
            Invoice History
          </h3>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)]">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--border-primary)]">
                    <td className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">{formatDate(inv.date)}</td>
                    <td className="px-3 py-2.5 text-sm font-medium text-[var(--text-primary)]">${(inv.amount / 100).toFixed(2)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        inv.status === "paid" ? "bg-[var(--status-success)]/10 text-[var(--status-success)]" :
                        inv.status === "open" ? "bg-[var(--status-warning)]/10 text-[var(--status-warning)]" :
                        "bg-[var(--status-error)]/10 text-[var(--status-error)]"
                      }`}>
                        {inv.status === "paid" ? <CheckCircle2 className="h-3 w-3" /> :
                         inv.status === "open" ? <AlertTriangle className="h-3 w-3" /> :
                         <XCircle className="h-3 w-3" />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {inv.url && (
                        <a href={inv.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--brand-primary)] hover:underline">
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isFree && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--status-info)]/20 bg-[var(--status-info)]/5 p-4">
          <ShieldAlert className="h-5 w-5 shrink-0 text-[var(--status-info)]" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">You&apos;re on the Free plan</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Upgrade to Pro or Agency to unlock unlimited opportunities, auto-propose, analytics, and more.</p>
          </div>
          <Button variant="default" size="sm" className="ml-auto shrink-0" onClick={() => router.push("/settings/billing?upgrade=pro")}>
            View Plans
          </Button>
        </div>
      )}
    </div>
  )
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = limit === Infinity
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100)
  const isNearLimit = !isUnlimited && pct >= 80
  const isAtLimit = !isUnlimited && pct >= 100

  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-medium text-[var(--text-primary)]">
          {used} {isUnlimited ? "" : `/ ${limit}`}
          {isUnlimited && <span className="text-[var(--text-muted)] text-xs ml-1">(unlimited)</span>}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 rounded-full bg-[var(--surface-tertiary)]">
          <div
            className={`h-2 rounded-full transition-all ${
              isAtLimit ? "bg-[var(--status-error)]" : isNearLimit ? "bg-[var(--status-warning)]" : "bg-[var(--brand-primary)]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
