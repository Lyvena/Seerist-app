import Link from "next/link"
import { Zap, Send, DollarSign, TrendingUp, Rocket, CheckCircle2, ArrowRight, Star, Trophy } from "lucide-react"
import { StatCard } from "@/components/common/StatCard"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { ScoreBadge } from "@/components/common/ScoreBadge"
import { requireUser } from "@/lib/auth"
import {
  getDashboardStats,
  getHighScoreOpportunities,
  getProfile,
  getProducts,
  getUserPlatformConfigs,
} from "@/lib/db"
import type { Opportunity, Profile } from "@/lib/db/schemas"

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${value.toLocaleString()}`
  }
}

interface OnboardingStep {
  label: string
  done: boolean
  href: string
}

export default async function DashboardPage() {
  const userId = await requireUser()
  const profile = ((await getProfile(userId).catch(() => null)) ?? {}) as Profile
  const [stats, topOpps, products, platformConfigs] = await Promise.all([
    getDashboardStats(userId).catch(() => null),
    getHighScoreOpportunities(userId, 70, 5).catch(() => []),
    getProducts(userId).catch(() => []),
    getUserPlatformConfigs(userId).catch(() => []),
  ])

  const onboardingSteps: OnboardingStep[] = [
    { label: "Connect your product", done: products.length > 0, href: "/products" },
    { label: "Select freelancing platforms", done: platformConfigs.length > 0, href: "/platforms" },
    { label: "Configure match preferences", done: profile.onboarding_completed ?? false, href: "/onboarding" },
    { label: "Generate your first proposal", done: Boolean(stats && stats.proposalsSent > 0), href: "/proposals" },
  ]
  const completedSteps = onboardingSteps.filter((s) => s.done).length

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" subtitle="Your opportunities at a glance">
        <Link href="/opportunities">
          <Button variant="default" className="gap-1.5">
            <Rocket className="h-4 w-4" />
            New Opportunity
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="New Opportunities"
          value={stats?.newOpportunities ?? 0}
          icon={Zap}
          trend={stats && stats.todayCount > 0 ? { value: `+${stats.todayCount} today`, positive: true } : undefined}
        />
        <StatCard label="Proposals Sent" value={stats?.proposalsSent ?? 0} icon={Send} />
        <StatCard
          label="Pipeline Value"
          value={stats ? formatCurrency(stats.pipelineValue, stats.pipelineCurrency) : "—"}
          icon={DollarSign}
        />
        <StatCard
          label="Avg Match Score"
          value={stats?.avgScore ?? 0}
          icon={TrendingUp}
          trend={stats && stats.starredCount > 0 ? { value: `${stats.starredCount} starred`, positive: true } : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Getting started */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary-light)]">
              <Rocket className="h-5 w-5 text-[var(--brand-primary)]" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Getting Started</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Complete these steps to start finding opportunities
              </p>
            </div>
            <span className="text-sm font-medium text-[var(--text-muted)]">
              {completedSteps}/{onboardingSteps.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
              style={{ width: `${(completedSteps / onboardingSteps.length) * 100}%` }}
            />
          </div>

          <div className="mt-6 space-y-3">
            {onboardingSteps.map((step) => (
              <div
                key={step.label}
                className="flex items-center gap-3 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-4 py-3"
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    step.done
                      ? "bg-[var(--status-success-light)] text-[var(--status-success)]"
                      : "bg-[var(--surface-tertiary)] text-[var(--text-muted)]"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-current" />
                  )}
                </div>
                <span
                  className={`flex-1 text-sm ${
                    step.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"
                  }`}
                >
                  {step.label}
                </span>
                {!step.done && (
                  <Link href={step.href}>
                    <Button variant="ghost" size="xs" className="gap-1">
                      Get started
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Wins summary */}
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--status-success-light)]">
              <Trophy className="h-5 w-5 text-[var(--status-success)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Wins</h2>
              <p className="text-sm text-[var(--text-muted)]">Deals closed</p>
            </div>
          </div>
          <div className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {stats?.wonDeals ?? 0}
          </div>
          <Link href="/won-deals" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-primary)] hover:underline">
            View won deals
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Top opportunities */}
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-[var(--brand-secondary)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Top Matches</h2>
          </div>
          <Link href="/opportunities" className="text-sm font-medium text-[var(--brand-primary)] hover:underline">
            View all
          </Link>
        </div>

        {topOpps.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-primary)] py-12 text-center">
            <Zap className="h-8 w-8 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">No high-score matches yet</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Connect a product and enable platforms to start receiving matches.
            </p>
            <Link href="/onboarding" className="mt-4">
              <Button variant="default" size="sm" className="gap-1.5">
                Set up monitoring
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[var(--border-primary)]">
            {topOpps.map((opp: Opportunity) => (
              <Link
                key={opp.id}
                href={`/opportunities?id=${opp.id}`}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-[var(--surface-secondary)] -mx-2 px-2 rounded-lg transition-colors"
              >
                <ScoreBadge score={opp.ai_score ?? 0} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">{opp.title}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {opp.budget_min || opp.budget_max
                      ? `${opp.budget_currency} ${[opp.budget_min, opp.budget_max].filter(Boolean).join("–")}`
                      : "Budget not specified"}
                  </p>
                </div>
                {opp.is_starred && <Star className="h-4 w-4 shrink-0 fill-[var(--brand-secondary)] text-[var(--brand-secondary)]" />}
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
