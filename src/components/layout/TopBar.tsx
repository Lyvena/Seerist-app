"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Search, Menu, ChevronRight } from "lucide-react"
import { CommandPalette } from "./CommandPalette"
import { NotificationBell } from "./NotificationBell"
import { UserMenu } from "@/components/auth/UserMenu"

interface TopBarProps {
  onMenuClick: () => void
}

interface PageMeta {
  title: string
  section: string
}

const PAGE_META: Record<string, PageMeta> = {
  "/dashboard": { title: "Dashboard", section: "Discover" },
  "/opportunities": { title: "Opportunities", section: "Discover" },
  "/live-feed": { title: "Live Feed", section: "Discover" },
  "/analytics": { title: "Analytics", section: "Discover" },
  "/pipeline": { title: "Pipeline", section: "Pipeline" },
  "/proposals": { title: "Proposals", section: "Pipeline" },
  "/won-deals": { title: "Won Deals", section: "Pipeline" },
  "/proposal-generator": { title: "Proposal Generator", section: "Pipeline" },
  "/products": { title: "Products", section: "Manage" },
  "/platforms": { title: "Platforms", section: "Manage" },
  "/settings": { title: "Settings", section: "Manage" },
  "/onboarding": { title: "Onboarding", section: "Manage" },
}

function getMeta(pathname: string): PageMeta {
  // Match longest prefix (handles /settings/profile etc.)
  const keys = Object.keys(PAGE_META).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (pathname === key || pathname.startsWith(key + "/")) {
      return PAGE_META[key]
    }
  }
  return { title: "Dashboard", section: "Discover" }
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const meta = getMeta(pathname)

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border-primary)] bg-[var(--surface-primary)] px-4 lg:px-6">
        <button
          onClick={onMenuClick}
          className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumbs */}
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="hidden sm:inline text-sm text-[var(--text-faint)]">{meta.section}</span>
          <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-[var(--text-faint)]" />
          <h1 className="font-cal text-base font-semibold text-[var(--text-primary)] truncate">{meta.title}</h1>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-1.5 text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary-border)] hover:text-[var(--text-secondary)]"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
            <span>Search…</span>
            <kbd className="ml-6 hidden lg:inline-flex items-center gap-0.5 rounded-md border border-[var(--border-primary)] bg-[var(--surface-primary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              <span>⌘</span>K
            </kbd>
          </button>

          <NotificationBell />
          <UserMenu />
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  )
}
