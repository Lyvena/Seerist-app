"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Search, Menu } from "lucide-react"
import { CommandPalette } from "./CommandPalette"
import { NotificationBell } from "./NotificationBell"
import { UserMenu } from "@/components/auth/UserMenu"
import { ProductSwitcher } from "./ProductSwitcher"

interface TopBarProps {
  onMenuClick: () => void
  currentProductId?: string
  onProductChange?: (productId: string) => void
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/opportunities": "Opportunities",
  "/live-feed": "Live Feed",
  "/pipeline": "Pipeline",
  "/proposals": "Proposals",
  "/won-deals": "Won Deals",
  "/proposal-generator": "Proposal Generator",
  "/analytics": "Analytics",
  "/products": "Products",
  "/platforms": "Platforms",
  "/settings": "Settings",
  "/onboarding": "Onboarding",
}

export function TopBar({ onMenuClick, currentProductId, onProductChange }: TopBarProps) {
  const pathname = usePathname()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard"

  const showProductSwitcher = ["/dashboard", "/opportunities", "/live-feed", "/pipeline", "/proposals"].includes(pathname)

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border-primary)] bg-[var(--surface-primary)] px-4 lg:px-6">
        <button
          onClick={onMenuClick}
          className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="hidden md:block text-base font-semibold text-[var(--text-primary)]">{pageTitle}</h1>

        {showProductSwitcher && (
          <ProductSwitcher currentProductId={currentProductId} onProductChange={onProductChange} />
        )}

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

          <NotificationBell />
          <UserMenu />
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  )
}
