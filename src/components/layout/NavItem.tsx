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
  const active = isActive ?? pathname === href

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        active
          ? "bg-[var(--sidebar-active)] text-white"
          : "text-[var(--sidebar-fg-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-[var(--sidebar-accent)]" : "text-[var(--sidebar-fg-muted)] group-hover:text-white"
        )}
      />
      <span>{label}</span>
    </Link>
  )
}
