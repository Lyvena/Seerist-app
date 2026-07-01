"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { User, Bell, Cpu, CreditCard, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/settings/profile", icon: User, label: "Profile" },
  { href: "/settings/alerts", icon: Bell, label: "Alerts" },
  { href: "/settings/ai", icon: Cpu, label: "AI Settings" },
  { href: "/settings/billing", icon: CreditCard, label: "Billing" },
  { href: "/settings/danger", icon: AlertTriangle, label: "Danger Zone" },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* Desktop vertical nav */}
      <nav className="hidden w-56 shrink-0 flex-col gap-1 lg:flex">
        <div className="mb-4">
          <h2 className="font-cal text-sm font-semibold text-[var(--text-primary)]">Settings</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage your account</p>
        </div>
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--brand-primary-light)] text-[var(--brand-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {/* Mobile horizontal scrollable tabs */}
      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-[var(--border-primary)] px-4 pb-px lg:hidden scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          )
        })}
      </nav>

      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  )
}
