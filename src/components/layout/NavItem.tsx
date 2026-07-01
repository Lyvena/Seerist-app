"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface NavItemProps {
  href: string
  icon: LucideIcon
  label: string
  isActive?: boolean
  onClick?: () => void
}

export function NavItem({ href, icon: Icon, label, isActive, onClick }: NavItemProps) {
  const pathname = usePathname()
  // Active if exact match, or if this is a parent segment (e.g. /settings/ai → /settings)
  const active = isActive ?? (pathname === href || pathname.startsWith(href + "/"))

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
        active
          ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-fg)]"
          : "text-[var(--sidebar-fg-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-white"
      )}
    >
      {/* Active accent bar */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-accent)] transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-[var(--sidebar-accent)]" : "text-[var(--sidebar-fg-muted)] group-hover:text-[var(--sidebar-fg-secondary)]"
        )}
      />
      <span>{label}</span>
    </Link>
  )
}
