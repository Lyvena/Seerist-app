"use client"

import { RadioGroup } from "./RadioGroup"
import { Slider } from "./Slider"
import { Input } from "./Input"

const DIGEST_OPTIONS = [
  { value: "realtime", label: "Real-time", description: "Get alerted immediately for every new match" },
  { value: "hourly", label: "Hourly digest", description: "Receive a summary every hour" },
  { value: "daily", label: "Daily digest", description: "One summary per day — recommended for most users" },
  { value: "weekly", label: "Weekly digest", description: "One summary per week" },
  { value: "never", label: "Never", description: "No email alerts — check the app manually" },
]

interface Step3AlertsProps {
  formData: {
    digestFrequency: string
    minScoreForAlert: number
    alertEmail: string
  }
  errors: Partial<Record<string, string>>
  onChange: (field: string, value: unknown) => void
}

export function Step3Alerts({ formData, errors, onChange }: Step3AlertsProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      <RadioGroup
        label="Digest frequency"
        options={DIGEST_OPTIONS}
        value={formData.digestFrequency}
        onChange={(v) => onChange("digestFrequency", v)}
        error={errors.digestFrequency}
      />

      <Slider
        label="Minimum score for alert"
        value={formData.minScoreForAlert}
        onChange={(v) => onChange("minScoreForAlert", v)}
        min={50}
        max={90}
        step={5}
        helperText="Only send alerts for matches scoring above this threshold"
      />

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
