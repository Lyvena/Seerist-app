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

  const currentTab = TABS.find((t) => pathname.startsWith(t.href)) ?? TABS[0]

  return (
    <div className="flex gap-8">
      <nav className="hidden w-48 shrink-0 flex-col gap-1 lg:flex">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Settings</h2>
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
                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-4 w-4" />
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
