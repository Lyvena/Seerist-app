"use client"

import * as React from "react"
import { Popover as PopoverRoot } from "radix-ui"

import { cn } from "@/lib/utils"

const Popover = PopoverRoot.Root
const PopoverTrigger = PopoverRoot.Trigger
const PopoverAnchor = PopoverRoot.Anchor

function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverRoot.Content>) {
  return (
    <PopoverRoot.Portal>
      <PopoverRoot.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-1.5 text-[var(--text-primary)] shadow-[var(--shadow-dropdown)]",
          "data-[state=open]:animate-scaleIn data-[state=closed]:animate-fadeIn",
          "outline-none",
          className
        )}
        {...props}
      />
    </PopoverRoot.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
