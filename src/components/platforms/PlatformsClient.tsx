"use client"

import { useState } from "react"
import { Globe, RefreshCw, BarChart3, Sparkles, Send } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { togglePlatform, updatePlatformConfig, triggerPlatformScan } from "@/app/actions/platforms"
import { toast } from "sonner"

interface Platform {
  id: string
  slug: string
  name: string
  base_url: string
  logo_url: string | null
  category: string | null
  is_supported: boolean
}

interface PlatformConfig {
  platform_id: string
  is_enabled: boolean
  min_score: number | null
  auto_propose: boolean | null
  notify_email: boolean | null
  custom_keywords: string[] | null
}

interface PlatformStats {
  thisWeek: number
  avgScore: number
  proposalsSent: number
}

interface PlatformsClientProps {
  platforms: Platform[]
  configMap: Record<string, PlatformConfig>
  statsMap: Record<string, PlatformStats>
  plan: string
  userId: string
}

export function PlatformsClient({ platforms, configMap, statsMap, plan, userId }: PlatformsClientProps) {
  const isPro = plan === "pro" || plan === "agency"
  const [syncing, setSyncing] = useState<string | null>(null)

  async function handleToggle(platformId: string, currentEnabled: boolean) {
    await togglePlatform(platformId, !currentEnabled)
    toast.success(currentEnabled ? "Platform disabled" : "Platform enabled")
  }

  async function handleConfigChange(platformId: string, field: string, value: unknown) {
    await updatePlatformConfig(platformId, { [field]: value })
  }

  async function handleSync(platformSlug: string) {
    setSyncing(platformSlug)
    toast.info(`Scanning ${platformSlug}...`)
    const { ok } = await triggerPlatformScan(platformSlug)
    setSyncing(null)
    if (ok) toast.success(`${platformSlug} scan complete`)
    else toast.error(`${platformSlug} scan failed`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Platforms" subtitle="Configure freelancing platforms for opportunity scanning" />

      <div className="grid gap-4 sm:grid-cols-2">
        {platforms.map((platform) => {
          const config = configMap[platform.id]
          const enabled = config?.is_enabled ?? false
          const stats = statsMap[platform.id]

          return (
            <div
              key={platform.id}
              className={`rounded-xl border bg-[var(--surface-primary)] p-5 transition-shadow hover:shadow-card ${
                enabled ? "border-[var(--border-primary)]" : "border-[var(--border-primary)] opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] overflow-hidden">
                    {platform.logo_url ? (
                      <img src={platform.logo_url} alt={platform.name} className="h-6 w-6 object-contain" />
                    ) : (
                      <Globe className="h-5 w-5 text-[var(--text-muted)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{platform.name}</h3>
                    <span className="inline-block rounded-md bg-[var(--surface-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] mt-0.5 capitalize">{platform.category ?? "General"}</span>
                  </div>
                </div>

                {platform.is_supported ? (
                  <label className="relative inline-flex h-5 w-9 cursor-pointer items-center">
                    <input type="checkbox" checked={enabled} onChange={() => handleToggle(platform.id, enabled)} className="peer sr-only" />
                    <div className="h-5 w-9 rounded-full bg-[var(--surface-tertiary)] after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[var(--brand-primary)] peer-checked:after:translate-x-full" />
                  </label>
                ) : (
                  <span className="rounded-md bg-[var(--surface-tertiary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">Coming Soon</span>
                )}
              </div>

              {enabled && platform.is_supported && (
                <div className="mt-4 space-y-3 border-t border-[var(--border-primary)] pt-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Min Score: {config?.min_score ?? 60}</label>
                    <input type="range" min="50" max="90" step="5" value={config?.min_score ?? 60}
                      onChange={(e) => handleConfigChange(platform.id, "min_score", parseInt(e.target.value))}
                      className="w-full accent-[var(--brand-primary)]" />
                    <div className="mt-0.5 flex justify-between text-[10px] text-[var(--text-muted)]"><span>50</span><span>90</span></div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {isPro && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={config?.auto_propose ?? false}
                          onChange={(e) => handleConfigChange(platform.id, "auto_propose", e.target.checked)}
                          className="h-4 w-4 rounded border-[var(--border-primary)] accent-[var(--brand-primary)]" />
                        <span className="text-xs text-[var(--text-secondary)]">Auto-propose</span>
                      </label>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={config?.notify_email ?? false}
                        onChange={(e) => handleConfigChange(platform.id, "notify_email", e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--border-primary)] accent-[var(--brand-primary)]" />
                      <span className="text-xs text-[var(--text-secondary)]">Email alerts</span>
                    </label>
                    <Button variant="ghost" size="xs" className="gap-1 text-[var(--text-muted)]" onClick={() => handleSync(platform.slug)} disabled={syncing === platform.slug}>
                      <RefreshCw className={`h-3 w-3 ${syncing === platform.slug ? "animate-spin" : ""}`} />
                      {syncing === platform.slug ? "Syncing..." : "Sync Now"}
                    </Button>
                  </div>

                  {config?.custom_keywords && config.custom_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {config.custom_keywords.map((kw) => (
                        <span key={kw} className="rounded-md bg-[var(--surface-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!platform.is_supported && (
                <div className="mt-3">
                  <a href="mailto:akshay@lyvena.xyz?subject=Request%20Platform%3A%20{platform.name}" className="text-xs text-[var(--brand-primary)] hover:underline">
                    + Request Platform
                  </a>
                </div>
              )}

              {stats && (
                <div className="mt-3 flex items-center gap-3 border-t border-[var(--border-primary)] pt-3 text-[11px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{stats.thisWeek} this week</span>
                  {stats.avgScore > 0 && <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />Avg {stats.avgScore}</span>}
                  {stats.proposalsSent > 0 && <span className="flex items-center gap-1"><Send className="h-3 w-3" />{stats.proposalsSent} sent</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
