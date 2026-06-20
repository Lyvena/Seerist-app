"use client"

import { Zap, Send, DollarSign, TrendingUp, Rocket, CheckCircle2, ArrowRight } from "lucide-react"
import { StatCard } from "@/components/common/StatCard"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"

const ONBOARDING_STEPS = [
  { label: "Connect your product", done: false },
  { label: "Select freelancing platforms", done: false },
  { label: "Configure match preferences", done: false },
  { label: "Generate your first proposal", done: false },
]

export default function AppPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Home"
        subtitle="Your opportunities at a glance"
      >
        <Button variant="default" className="gap-1.5">
          <Rocket className="h-4 w-4" />
          New Opportunity
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="New Opportunities"
          value="12"
          icon={Zap}
          trend={{ value: "+3 today", positive: true }}
        />
        <StatCard
          label="Proposals Sent"
          value="8"
          icon={Send}
          trend={{ value: "+2 this week", positive: true }}
        />
        <StatCard
          label="Pipeline Value"
          value="$24,500"
          icon={DollarSign}
          trend={{ value: "+12.5%", positive: true }}
        />
        <StatCard
          label="Avg Match Score"
          value="74"
          icon={TrendingUp}
          trend={{ value: "+5 pts", positive: true }}
        />
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary-light)]">
            <Rocket className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Getting Started</h2>
            <p className="text-sm text-[var(--text-muted)]">Complete these steps to start finding opportunities</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {ONBOARDING_STEPS.map((step) => (
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
                <Button variant="ghost" size="xs" className="gap-1">
                  Get started
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
