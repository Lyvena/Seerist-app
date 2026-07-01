import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { Sparkles } from "lucide-react"

interface ComingSoonProps {
  icon: LucideIcon
  title: string
  description: string
  features: { label: string; description: string }[]
  className?: string
}

/**
 * Richer placeholder for not-yet-built pages. Explains the upcoming feature
 * with a visual feature list instead of a bare empty state.
 */
export function ComingSoon({ icon: Icon, title, description, features, className }: ComingSoonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-primary-light)]">
            <Icon className="h-7 w-7 text-[var(--brand-primary)]" />
          </div>
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary-light)] px-2.5 py-1 text-xs font-medium text-[var(--brand-primary)]">
            <Sparkles className="h-3 w-3" />
            Coming soon
          </div>
          <h2 className="mt-3 font-cal text-2xl font-semibold text-[var(--text-primary)]">{title}</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feat) => (
          <div
            key={feat.label}
            className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-5"
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{feat.label}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{feat.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
