"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  helperText?: string
  maxLength?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, maxLength, id, ...props }, ref) => {
    const textareaId = id ?? label.toLowerCase().replace(/\s+/g, "-")
    const errorId = `${textareaId}-error`
    const helperId = `${textareaId}-helper`

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={textareaId} className="block text-sm font-medium text-[var(--text-primary)]">
            {label}
          </label>
          {maxLength && (
            <span className="text-xs text-[var(--text-muted)]">
              {String(props.value ?? "").length}/{maxLength}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            "w-full rounded-lg border bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors resize-y",
            "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-[var(--status-danger)] focus:ring-[var(--status-danger-light)]"
              : "border-[var(--border-primary)] hover:border-[var(--text-muted)]",
            className
          )}
          {...props}
        />
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

Textarea.displayName = "Textarea"
