"use client"

import { cn } from "@/lib/utils"

interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupProps {
  label: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  error?: string
}

export function RadioGroup({ label, options, value, onChange, error }: RadioGroupProps) {
  const groupId = label.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
        {label}
      </label>
      <div className="space-y-2" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 transition-all cursor-pointer",
              value === option.value
                ? "border-[var(--brand-primary)] bg-[var(--brand-primary-light)]"
                : "border-[var(--border-primary)] hover:border-[var(--text-muted)] hover:bg-[var(--surface-secondary)]"
            )}
          >
            <input
              type="radio"
              name={groupId}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className={cn(
                "mt-1 h-4 w-4 appearance-none border rounded-full",
                "checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-light)]"
              )}
            />
            <div className="flex-1 min-w-0">
              <span className={cn("block font-medium", value === option.value ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]")}>
                {option.label}
              </span>
              {option.description && (
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">{option.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-sm text-[var(--status-danger)]" role="alert">{error}</p>}
    </div>
  )
}
