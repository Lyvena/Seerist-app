"use client"

import { cn } from "@/lib/utils"

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer" htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>
      <div className="relative flex shrink-0">
        <input
          type="checkbox"
          id={label.toLowerCase().replace(/\s+/g, "-")}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={cn(
            "w-11 h-6 rounded-full transition-colors",
            checked
              ? "bg-[var(--brand-primary)]"
              : "bg-[var(--surface-tertiary)]",
            "peer-focus:ring-2 peer-focus:ring-[var(--brand-primary-light)]"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform",
              checked ? "translate-x-5" : "translate-x-0"
            )}
          />
        </div>
      </div>
      <div className="min-w-0">
        <span className={cn("block text-sm font-medium", disabled ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]")}>
          {label}
        </span>
        {description && (
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{description}</p>
        )}
      </div>
    </label>
  )
}
