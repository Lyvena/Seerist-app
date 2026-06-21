"use client"

import { CheckCircle2 } from "lucide-react"
import { Input } from "./Input"
import { RadioGroup } from "./RadioGroup"

const DIGEST_OPTIONS = [
  { value: "realtime", label: "Real-time", description: "Get alerted immediately for every new match" },
  { value: "hourly", label: "Hourly digest", description: "Receive a summary every hour" },
  { value: "daily", label: "Daily digest", description: "One summary per day — recommended for most users" },
  { value: "weekly", label: "Weekly digest", description: "One summary per week" },
  { value: "never", label: "Never", description: "No email alerts — check the app manually" },
]

interface Step3StartScanningProps {
  formData: {
    digestFrequency: string
    minScoreForAlert: number
    alertEmail: string
  }
  errors: Partial<Record<string, string>>
  onChange: (field: string, value: unknown) => void
  summary: {
    productName: string
    platformCount: number
  }
}

export function Step3StartScanning({ formData, errors, onChange, summary }: Step3StartScanningProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="text-center py-4">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--status-success-light)]">
          <CheckCircle2 className="h-7 w-7 text-[var(--status-success)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Ready to start scanning?</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">We'll scan for opportunities matching your product.</p>
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-5">
        <h4 className="font-medium text-[var(--text-primary)] mb-3">Your setup</h4>
        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[var(--text-muted)]">Product</dt>
            <dd className="font-medium text-[var(--text-primary)]">{summary.productName}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Platforms</dt>
            <dd className="font-medium text-[var(--text-primary)]">{summary.platformCount} platforms configured</dd>
          </div>
        </dl>
      </div>

      <RadioGroup
        label="Alert frequency"
        options={DIGEST_OPTIONS}
        value={formData.digestFrequency}
        onChange={(v) => onChange("digestFrequency", v)}
        error={errors.digestFrequency}
      />

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Minimum score for alert: <span className="font-semibold text-[var(--brand-primary)]">{formData.minScoreForAlert}</span>
        </label>
        <input
          type="range"
          min={50}
          max={90}
          step={5}
          value={formData.minScoreForAlert}
          onChange={(e) => onChange("minScoreForAlert", Number(e.target.value))}
          className="w-full accent-[var(--brand-primary)]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>50</span>
          <span>90</span>
        </div>
      </div>

      <Input
        label="Alert email address"
        type="email"
        value={formData.alertEmail}
        onChange={(e) => onChange("alertEmail", e.target.value)}
        error={errors.alertEmail}
        placeholder="your@email.com"
        required
      />
    </div>
  )
}