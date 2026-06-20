"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption[]
  error?: string
  helperText?: string
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, helperText, placeholder, id, ...props }, ref) => {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-")
    const errorId = `${selectId}-error`
    const helperId = `${selectId}-helper`

    return (
      <div className="w-full">
        <label htmlFor={selectId} className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            "w-full rounded-lg border bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors appearance-none",
            "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-[var(--status-danger)] focus:ring-[var(--status-danger-light)]"
              : "border-[var(--border-primary)] hover:border-[var(--text-muted)]",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-[var(--status-danger)]" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-[var(--text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = "Select"
