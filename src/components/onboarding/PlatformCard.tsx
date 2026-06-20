"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { Toggle } from "./Toggle"
import { Slider } from "./Slider"

interface PlatformCardProps {
  platform: {
    id: string
    slug: string
    name: string
    logo_url: string | null
    category: string
  }
  enabled: boolean
  minScore: number
  onEnabledChange: (enabled: boolean) => void
  onMinScoreChange: (score: number) => void
  isPreSelected?: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  freelance: "bg-[var(--brand-primary-light)] text-[var(--brand-primary)]",
  remote_jobs: "bg-[var(--status-success-light)] text-[var(--status-success)]",
  marketplace: "bg-[var(--status-warning-light)] text-[var(--status-warning)]",
  talent_network: "bg-[var(--status-info-light)] text-[var(--status-info)]",
}

export function PlatformCard({ platform, enabled, minScore, onEnabledChange, onMinScoreChange, isPreSelected }: PlatformCardProps) {
  const categoryColor = CATEGORY_COLORS[platform.category] ?? "bg-[var(--surface-tertiary)] text-[var(--text-secondary)]"

  return (
    <div className="flex flex-col h-full rounded-xl border bg-[var(--surface-primary)] p-4 transition-all hover:border-[var(--text-muted)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)]">
          {platform.logo_url ? (
            <Image src={platform.logo_url} alt={platform.name} width={24} height={24} className="h-6 w-6 object-contain" unoptimized />
          ) : (
            <span className="text-lg font-semibold text-[var(--text-secondary)]">
              {platform.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-[var(--text-primary)] truncate">{platform.name}</h3>
            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", categoryColor)}>
              {platform.category.replace("_", " ")}
            </span>
          </div>
          {isPreSelected && (
            <p className="mt-0.5 text-xs text-[var(--brand-primary)]">Recommended</p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border-primary)]">
        <Toggle
          label="Monitor this platform"
          checked={enabled}
          onChange={onEnabledChange}
        />
        {enabled && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <Slider
              label="Min score threshold"
              value={minScore}
              onChange={onMinScoreChange}
              min={60}
              max={90}
              step={5}
              helperText="Only notify for matches above this score"
            />
          </div>
        )}
      </div>
    </div>
  )
}
