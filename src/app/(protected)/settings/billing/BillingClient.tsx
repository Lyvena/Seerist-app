"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CreditCard, Download, ExternalLink, ShieldAlert,
  ArrowRight, CheckCircle2, XCircle, AlertTriangle, Loader2,
} from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { PLAN_NAMES, PLAN_PRICES, type PlanTier } from "@/lib/plan-limits"
import { toast } from "sonner"
import { useEffect } from "react"

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
  isOwner?: boolean
}

export default function BillingClient({
  plan, planName, status, currentPeriodEnd, cancelAtPeriodEnd,
  paymentProviderId, usage, limits, invoices, isOwner,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [upgrading, setUpgrading] = useState<"pro" | "agency" | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const isFree = plan === "free" && !isOwner
  // Keep plan as a loose string so the plan-card comparisons below don't get
  // narrowed by the isFree conditional block.
  const currentPlan: string = plan
  const isActive = status === "active"

  // Owner banner
  const OwnerBadge = isOwner ? (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--brand-primary-border)] bg-[var(--brand-primary-light)] p-4">
      <ShieldAlert className="h-5 w-5 shrink-0 text-[var(--brand-primary)]" />
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">Project Owner — Full Access</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          You have unlimited access to all Seerist features, forever. No subscription required.
        </p>
      </div>
    </div>
  ) : null

  function formatDate(date: string | null) {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

  // Surface checkout outcome from URL params after redirect back from Suby.
  useEffect(() => {
    if (searchParams.get("upgrade") === "success") {
      toast.success("Payment successful — your plan is now active.")
      router.replace("/settings/billing")
    } else if (searchParams.get("upgrade") === "cancelled") {
      toast.error("Checkout was cancelled.")
      router.replace("/settings/billing")
    }
  }, [searchParams, router])

  async function handleUpgrade(target: "pro" | "agency", annual = false) {
    setUpgrading(target)
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: target, annual }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to start checkout")
      // Redirect to the Suby hosted checkout page.
      window.location.href = data.redirectUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout")
      setUpgrading(null)
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your subscription? You'll keep access until the end of your current billing period, then drop to the Free plan.")) return
    setCancelling(true)
    try {
      const res = await fetch("/api/payments/cancel", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Failed to cancel")
      toast.success("Subscription cancelled — access continues until the period ends.")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel subscription")
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Billing" subtitle="Manage your subscription and payment details" />

      {OwnerBadge}

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Current Plan</p>
            <h2 className="mt-1 font-cal text-2xl font-semibold text-[var(--text-primary)]">{planName}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {isOwner ? (
                "Unlimited access — complimentary, never expires"
              ) : isFree ? (
                "Free forever — no payment needed"
              ) : cancelAtPeriodEnd ? (
                <>Cancels on {formatDate(currentPeriodEnd)}</>
              ) : (
                <>Renews on {formatDate(currentPeriodEnd)}</>
              )}
            </p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isActive ? "bg-[var(--status-success-light)] text-[var(--status-success)]" : "bg-[var(--status-warning-light)] text-[var(--status-warning)]"
          }`}>
            {status}
          </div>
        </div>

        {!isOwner && (
          <div className="mt-6 flex flex-wrap gap-3">
            {isFree ? (
              <>
                <Button onClick={() => handleUpgrade("pro")} disabled={!!upgrading}>
                  {upgrading === "pro" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Upgrade to Pro — ${PLAN_PRICES.pro.monthly}/mo
                </Button>
                <Button variant="outline" onClick={() => handleUpgrade("agency")} disabled={!!upgrading}>
                  {upgrading === "agency" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Upgrade to Agency — ${PLAN_PRICES.agency.monthly}/mo
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleCancel} disabled={cancelling}>
                  {cancelling ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  {cancelling ? "Cancelling…" : "Cancel Subscription"}
                </Button>
                <a href="https://customer.suby.fi" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Manage billing on Suby
                  </Button>
                </a>
              </>
            )}
          </div>
        )}
      </div>

      {isFree && (
        <div className="grid gap-4 sm:grid-cols-3">
          <PlanCard
            name="Free"
            price="$0"
            features={["1 product", "5 platforms", "100 opportunities/mo", "20 proposals/mo"]}
            current={currentPlan === "free"}
          />
          <PlanCard
            name="Pro"
            price={`$${PLAN_PRICES.pro.monthly}/mo`}
            features={["3 products", "All 14 platforms", "Unlimited opportunities", "100 proposals/mo", "Analytics", "Auto-propose"]}
            current={currentPlan === "pro"}
            cta={currentPlan !== "pro" ? "Upgrade to Pro" : undefined}
            onCta={() => handleUpgrade("pro")}
            loading={upgrading === "pro"}
            highlight
          />
          <PlanCard
            name="Agency"
            price={`$${PLAN_PRICES.agency.monthly}/mo`}
            features={["Unlimited products", "All 14 platforms", "Unlimited everything", "Priority support"]}
            current={currentPlan === "agency"}
            cta={currentPlan !== "agency" ? "Upgrade to Agency" : undefined}
            onCta={() => handleUpgrade("agency")}
            loading={upgrading === "agency"}
          />
        </div>
      )}

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
                        inv.status === "paid" ? "bg-[var(--status-success-light)] text-[var(--status-success)]" :
                        inv.status === "open" ? "bg-[var(--status-warning-light)] text-[var(--status-warning)]" :
                        "bg-[var(--status-danger-light)] text-[var(--status-danger)]"
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
        </div>
      )}
    </div>
  )
}

function PlanCard({
  name, price, features, current, cta, onCta, loading, highlight,
}: {
  name: string
  price: string
  features: string[]
  current: boolean
  cta?: string
  onCta?: () => void
  loading?: boolean
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-6 ${
      highlight ? "border-[var(--brand-primary-border)] bg-[var(--brand-primary-lighter)]" : "border-[var(--border-primary)] bg-[var(--surface-primary)]"
    }`}>
      <div className="flex items-center justify-between">
        <h3 className="font-cal text-lg font-semibold text-[var(--text-primary)]">{name}</h3>
        {current && <span className="rounded-full bg-[var(--status-success-light)] px-2 py-0.5 text-xs font-medium text-[var(--status-success)]">Current</span>}
      </div>
      <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{price}</p>
      <ul className="mt-4 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--status-success)]" />
            {f}
          </li>
        ))}
      </ul>
      {cta && (
        <Button className="mt-5 w-full" onClick={onCta} disabled={loading}>
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {cta}
          {!loading && <ArrowRight className="ml-1.5 h-4 w-4" />}
        </Button>
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
              isAtLimit ? "bg-[var(--status-danger)]" : isNearLimit ? "bg-[var(--status-warning)]" : "bg-[var(--brand-primary)]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
