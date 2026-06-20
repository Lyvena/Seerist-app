"use client"

import { useState } from "react"
import { Bell, Mail, Send, Sliders, Globe } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { saveAlertPreferences, sendTestAlert } from "@/app/actions/alerts"
import { toast } from "sonner"

interface AlertPreferencesClientProps {
  userId: string
  email: string
  initialDigestFrequency: string
  initialMinScore: number
  initialPlatforms: string[]
  enabledPlatformIds: string[]
}

export function AlertPreferencesClient({
  userId,
  email,
  initialDigestFrequency,
  initialMinScore,
  initialPlatforms,
  enabledPlatformIds,
}: AlertPreferencesClientProps) {
  const [frequency, setFrequency] = useState(initialDigestFrequency)
  const [minScore, setMinScore] = useState(initialMinScore)
  const [platformsIncluded, setPlatformsIncluded] = useState(initialPlatforms)
  const [emailOverride, setEmailOverride] = useState(email)
  const [sending, setSending] = useState(false)

  async function handleSave() {
    const { error } = await saveAlertPreferences(userId, {
      digest_frequency: frequency,
      min_score_for_alert: minScore,
      platforms_included: platformsIncluded,
    })
    if (error) toast.error("Failed to save preferences")
    else toast.success("Alert preferences saved")
  }

  async function handleTestEmail() {
    setSending(true)
    await sendTestAlert(userId, emailOverride)
    setSending(false)
    toast.success("Test email sent")
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Alert Preferences" subtitle="Configure how and when you get notified" />

      <div className="max-w-lg space-y-6">
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Bell className="h-4 w-4" />
            Digest Frequency
          </h3>
          <div className="mt-4 space-y-2">
            {["never", "realtime", "daily", "weekly"].map((freq) => (
              <label key={freq} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-4 py-3 hover:bg-[var(--surface-tertiary)]">
                <input type="radio" name="frequency" value={freq} checked={frequency === freq}
                  onChange={() => setFrequency(freq)} className="h-4 w-4 accent-[var(--brand-primary)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{freq === "realtime" ? "Real-time" : freq}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {freq === "never" && "No email notifications"}
                    {freq === "realtime" && "Email for each new matched opportunity"}
                    {freq === "daily" && "Daily summary of new opportunities"}
                    {freq === "weekly" && "Weekly digest of opportunities and activity"}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Sliders className="h-4 w-4" />
            Minimum Score Threshold
          </h3>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Only alert me on opportunities scored {minScore}+</span>
              <span className="font-semibold text-[var(--brand-primary)]">{minScore}</span>
            </div>
            <input type="range" min="50" max="95" step="5" value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value))}
              className="mt-2 w-full accent-[var(--brand-primary)]" />
            <div className="flex justify-between text-[11px] text-[var(--text-muted)]"><span>50</span><span>95</span></div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Mail className="h-4 w-4" />
            Email Settings
          </h3>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Email Address</label>
              <input value={emailOverride} onChange={(e) => setEmailOverride(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]" />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleTestEmail} disabled={sending}>
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending..." : "Send Test Email"}
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="default" size="sm" onClick={handleSave}>Save Preferences</Button>
        </div>
      </div>
    </div>
  )
}
