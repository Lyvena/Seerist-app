"use client";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

const sectionLabelVariants = cva(
  "inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-light px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent",
  {
    variants: {
      variant: {
        default: "",
        subtle: "border-border bg-surface-2 text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface SectionLabelProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof sectionLabelVariants> {
  icon?: LucideIcon;
  children: ReactNode;
}

export function SectionLabel({ icon: Icon, children, className, variant, ...props }: SectionLabelProps) {
  return (
    <div className={cn(sectionLabelVariants({ variant }), className)} {...props}>
      {Icon && <Icon className="size-3.5" />}
      <span>{children}</span>
    </div>
  );
}
