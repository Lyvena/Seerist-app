"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Zap,
  Radio,
  KanbanSquare,
  Trophy,
  FileText,
  Cpu,
  Package,
  Globe,
  Settings2,
  ChevronUp,
  Sparkles,
} from "lucide-react"
import { NavItem } from "./NavItem"

const NAV_SECTIONS = [
  {
    label: "DISCOVER",
    items: [
      { href: "/opportunities", icon: Zap, label: "Opportunities" },
      { href: "/app/live-feed", icon: Radio, label: "Live Feed" },
    ],
  },
    {
      label: "PIPELINE",
      items: [
        { href: "/pipeline", icon: KanbanSquare, label: "My Pipeline" },
        { href: "/proposals", icon: FileText, label: "Proposals" },
        { href: "/app/won-deals", icon: Trophy, label: "Won Deals" },
      ],
    },
  {
    label: "TOOLS",
    items: [
      { href: "/app/proposal-generator", icon: FileText, label: "Proposal Generator" },
      { href: "/app/ai-settings", icon: Cpu, label: "AI Settings" },
    ],
  },
    {
      label: "MANAGE",
      items: [
        { href: "/products", icon: Package, label: "My Products" },
        { href: "/platforms", icon: Globe, label: "Platforms" },
        { href: "/app/settings", icon: Settings2, label: "Settings" },
      ],
    },
]

export function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4 scrollbar-none">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-[var(--sidebar-fg-muted)]">
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
  return (
    <aside className="hidden md:flex md:flex-col md:w-[var(--sidebar-width)] md:fixed md:inset-y-0 md:z-30 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]">
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-[var(--sidebar-border)]">
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

      <div className="border-t border-[var(--sidebar-border)] p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg bg-[var(--sidebar-accent)] px-3 py-2.5 text-left text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Upgrade to Pro</p>
            <p className="text-[11px] text-white/70">Unlock AI proposals</p>
          </div>
          <ChevronUp className="h-4 w-4 shrink-0 rotate-90 text-white/70" />
        </button>
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--sidebar-border)] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sidebar-fg-muted)] text-xs font-semibold text-white">
          A
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">Andrey</p>
          <p className="text-[11px] text-[var(--sidebar-fg-muted)]">Free Plan</p>
        </div>
      </div>
    </aside>
  )
}
