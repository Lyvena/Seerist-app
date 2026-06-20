"use client"

import { PlatformCard } from "./PlatformCard"

interface Step2PlatformsProps {
  platforms: {
    id: string
    slug: string
    name: string
    logo_url: string | null
    category: string
  }[]
  selectedPlatforms: Record<string, { enabled: boolean; minScore: number }>
  onPlatformToggle: (platformId: string, enabled: boolean) => void
  onMinScoreChange: (platformId: string, score: number) => void
}

const PRE_SELECTED_SLUGS = ["upwork", "freelancer", "weworkremotely", "contra", "peopleperhour"]

export function Step2Platforms({ platforms, selectedPlatforms, onPlatformToggle, onMinScoreChange }: Step2PlatformsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Choose which platforms to monitor. We recommend starting with these major freelance platforms.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((platform) => {
          const config = selectedPlatforms[platform.id] ?? { enabled: PRE_SELECTED_SLUGS.includes(platform.slug), minScore: 70 }
          const isPreSelected = PRE_SELECTED_SLUGS.includes(platform.slug)

          return (
            <PlatformCard
              key={platform.id}
              platform={platform}
              enabled={config.enabled}
              minScore={config.minScore}
              onEnabledChange={(enabled) => onPlatformToggle(platform.id, enabled)}
              onMinScoreChange={(score) => onMinScoreChange(platform.id, score)}
              isPreSelected={isPreSelected}
            />
          )
        })}
      </div>
    </div>
  )
}
