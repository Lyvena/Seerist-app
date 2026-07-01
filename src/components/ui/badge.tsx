import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2.5 text-xs font-medium whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-[var(--brand-primary-light)] text-[var(--brand-primary)]",
        secondary: "bg-[var(--surface-tertiary)] text-[var(--text-secondary)]",
        outline: "border-[var(--border-primary)] text-[var(--text-secondary)]",
        ghost: "text-[var(--text-muted)]",
        link: "text-[var(--brand-primary)] underline-offset-4 hover:underline",
        success: "bg-[var(--status-success-light)] text-[var(--status-success)]",
        warning: "bg-[var(--status-warning-light)] text-[var(--status-warning)]",
        danger: "bg-[var(--status-danger-light)] text-[var(--status-danger)]",
        info: "bg-[var(--status-info-light)] text-[var(--status-info)]",
        destructive: "bg-[var(--status-danger-light)] text-[var(--status-danger)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
