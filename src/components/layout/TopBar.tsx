"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Search, Menu, Sparkles } from "lucide-react"
import { CommandPalette } from "./CommandPalette"
import { NotificationBell } from "./NotificationBell"

interface TopBarProps {
  onMenuClick: () => void
  changelogNew?: boolean
  onChangelogClick?: () => void
}

const PAGE_TITLES: Record<string, string> = {
  "/app": "Home",
  "/opportunities": "Opportunities",
  "/app/live-feed": "Live Feed",
  "/app/pipeline": "My Pipeline",
  "/app/won-deals": "Won Deals",
  "/app/proposal-generator": "Proposal Generator",
  "/app/ai-settings": "AI Settings",
  "/app/products": "My Products",
  "/app/platforms": "Platforms",
  "/app/settings": "Settings",
}

export function TopBar({ onMenuClick, changelogNew, onChangelogClick }: TopBarProps) {
  const pathname = usePathname()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard"

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-[var(--border-primary)] bg-[var(--surface-primary)] px-4 lg:px-6">
        <button
          onClick={onMenuClick}
          className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-base font-semibold text-[var(--text-primary)]">{pageTitle}</h1>

        <div className="flex flex-1 items-center justify-end gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:border-[var(--brand-primary-border)] hover:text-[var(--text-secondary)] transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-6 hidden lg:inline-flex items-center gap-0.5 rounded-md border border-[var(--border-primary)] bg-[var(--surface-primary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              <span>⌘</span>K
            </kbd>
          </button>

          <button
            onClick={onChangelogClick}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)] transition-colors"
            aria-label="What's new"
          >
            <Sparkles className="h-4 w-4" />
            {changelogNew && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-primary)]" />
              </span>
            )}
          </button>

          <NotificationBell />

          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-semibold text-white"
            aria-label="User menu"
          >
            A
          </button>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  )
}
