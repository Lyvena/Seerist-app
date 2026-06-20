"use client"

interface Step4ConfirmProps {
  summary: {
    productName: string
    platformCount: number
    digestFrequency: string
    minScore: number
  }
}

export function Step4Confirm({ summary }: Step4ConfirmProps) {
  const formatFrequency = (freq: string) => {
    const map: Record<string, string> = {
      realtime: "Real-time",
      hourly: "Hourly",
      daily: "Daily",
      weekly: "Weekly",
      never: "Never",
    }
    return map[freq] ?? freq
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-success-light)]">
          <svg className="h-8 w-8 text-[var(--status-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">You&apos;re all set!</h2>
        <p className="mt-2 text-[var(--text-muted)]">Your workspace is ready to start finding opportunities.</p>
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-5">
        <h3 className="font-medium text-[var(--text-primary)]">What we&apos;ve configured</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-[var(--text-muted)]">Product</dt>
            <dd className="font-medium text-[var(--text-primary)]">{summary.productName}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--text-muted)]">Platforms monitoring</dt>
            <dd className="font-medium text-[var(--text-primary)]">{summary.platformCount}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--text-muted)]">Alert frequency</dt>
            <dd className="font-medium text-[var(--text-primary)]">{formatFrequency(summary.digestFrequency)}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--text-muted)]">Min alert score</dt>
            <dd className="font-medium text-[var(--text-primary)]">{summary.minScore}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-[var(--brand-primary-border)] bg-[var(--brand-primary-light)] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-[var(--brand-primary)]">What happens next</h4>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              We&apos;re scanning platforms now for opportunities that match your product.
              You&apos;ll see your first matches on the dashboard within minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
