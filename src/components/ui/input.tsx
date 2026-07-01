import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-3 py-1 text-sm text-[var(--text-primary)] transition-colors outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--text-primary)]",
        "placeholder:text-[var(--text-faint)]",
        "hover:border-[var(--border-strong)]",
        "focus-visible:border-[var(--brand-primary)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--surface-tertiary)] disabled:opacity-60",
        "aria-invalid:border-[var(--status-danger)] aria-invalid:ring-2 aria-invalid:ring-[var(--status-danger)]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
