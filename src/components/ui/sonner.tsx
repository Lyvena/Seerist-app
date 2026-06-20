"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--surface-primary)] group-[.toaster]:text-[var(--text-primary)] group-[.toaster]:border-[var(--border-primary)] group-[.toaster]:shadow-dropdown group-[.toaster]:rounded-lg",
          description: "text-[var(--text-muted)] text-sm",
          actionButton:
            "bg-[var(--brand-primary)] text-white rounded-lg text-xs font-medium",
          cancelButton:
            "bg-[var(--surface-tertiary)] text-[var(--text-secondary)] rounded-lg text-xs font-medium",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
