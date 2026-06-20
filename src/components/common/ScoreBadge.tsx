import { cn } from "@/lib/utils"

interface ScoreBadgeProps {
  score: number
  className?: string
}

const tiers = [
  { min: 0, max: 39, label: "Low", bg: "bg-[var(--status-danger-light)]", text: "text-[var(--status-danger)]" },
  { min: 40, max: 59, label: "Fair", bg: "bg-[var(--status-warning-light)]", text: "text-[var(--status-warning)]" },
  { min: 60, max: 79, label: "Good", bg: "bg-[var(--status-info-light)]", text: "text-[var(--status-info)]" },
  { min: 80, max: 100, label: "Excellent", bg: "bg-[var(--status-success-light)]", text: "text-[var(--status-success)]" },
]

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const tier = tiers.find((t) => score >= t.min && score <= t.max) ?? tiers[0]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        tier.bg,
        tier.text,
        className
      )}
    >
      <span className="tabular-nums">{score}</span>
      <span className="opacity-70">{tier.label}</span>
    </span>
  )
}
