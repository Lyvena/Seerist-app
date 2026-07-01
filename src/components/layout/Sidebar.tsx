"use client"

import { Zap, Radio, KanbanSquare, Trophy, FileText, Cpu, Package, Globe, Settings2, BarChart3 } from "lucide-react"
import { NavItem } from "./NavItem"
import { ProductSwitcher } from "./ProductSwitcher"
import { Logo } from "./Logo"
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
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4 scrollbar-none">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-[var(--sidebar-fg-muted)] uppercase">
            {section.label}
          </p>
          <div className="flex flex-col gap-0.5">
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
      <div className="flex h-16 items-center px-5">
        <Logo variant="light" href="/dashboard" />
      </div>

      <SidebarContent />

      <div className="border-t border-[var(--sidebar-border)] p-3">
        <ProductSwitcher />
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--sidebar-border)] px-5 py-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sidebar-accent)]/25 text-xs font-semibold text-[var(--sidebar-accent)] ring-1 ring-[var(--sidebar-accent)]/30">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{user?.email ?? "User"}</p>
          <p className="text-[11px] text-[var(--sidebar-fg-muted)]">Free plan</p>
        </div>
      </div>
    </aside>
  )
}
