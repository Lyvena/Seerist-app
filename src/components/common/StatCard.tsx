import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: string; positive: boolean }
  className?: string
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "group rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5 transition-shadow hover:shadow-[var(--shadow-md)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary-light)]">
            <Icon className="h-4 w-4 text-[var(--brand-primary)]" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-cal text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
              trend.positive
                ? "bg-[var(--status-success-light)] text-[var(--status-success)]"
                : "bg-[var(--status-danger-light)] text-[var(--status-danger)]"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
    </div>
  )
}
