"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Zap, Radio, KanbanSquare, Trophy, FileText, Cpu, Package, Globe, Settings2, BarChart3 } from "lucide-react"
import { NavItem } from "./NavItem"
import { ProductSwitcher } from "./ProductSwitcher"
import { useAuth } from "@/components/auth/AuthProvider"

const NAV_SECTIONS = [
  {
    label: "Discover",
    items: [
      { href: "/dashboard", icon: Cpu, label: "Dashboard" },
      { href: "/opportunities", icon: Zap, label: "Opportunities" },
      { href: "/live-feed", icon: Radio, label: "Live Feed" },
      { href: "/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { href: "/pipeline", icon: KanbanSquare, label: "Pipeline" },
      { href: "/proposals", icon: FileText, label: "Proposals" },
      { href: "/won-deals", icon: Trophy, label: "Won Deals" },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/products", icon: Package, label: "Products" },
      { href: "/platforms", icon: Globe, label: "Platforms" },
      { href: "/settings", icon: Settings2, label: "Settings" },
    ],
  },
]

export function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-3 scrollbar-none">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="mb-1 px-3 text-[10px] font-semibold tracking-[0.08em] text-[var(--sidebar-fg-muted)]">
            {section.label}
          </p>
          <div className="flex flex-col gap-0">
            {section.items.map((item) => (
              <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} onClick={onNavClick} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function Sidebar() {
  const { user } = useAuth()
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U"

  return (
    <aside className="hidden md:flex md:flex-col md:w-[var(--sidebar-width)] md:fixed md:inset-y-0 md:z-30 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]">
      <div className="flex h-14 items-center gap-2 px-3 border-b border-[var(--sidebar-border)]">
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-accent)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" opacity="0.4" />
            <circle cx="8" cy="8" r="3.5" stroke="white" strokeWidth="1.5" opacity="0.7" />
            <circle cx="8" cy="8" r="1.5" fill="white" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">Seerist</span>
      </div>

      <SidebarContent />

      <div className="border-t border-[var(--sidebar-border)] p-2">
        <ProductSwitcher />
      </div>

      <div className="flex items-center gap-2.5 border-t border-[var(--sidebar-border)] px-3 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sidebar-accent)] text-xs font-semibold text-white">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{user?.email ?? "User"}</p>
        </div>
      </div>
    </aside>
  )
}
