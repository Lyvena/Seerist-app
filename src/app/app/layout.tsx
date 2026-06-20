"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { MobileDrawer } from "@/components/layout/MobileDrawer"
import { useChangelog } from "@/components/changelog"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { hasNew, open: changelogOpen, setOpen: setChangelogOpen, markSeen } = useChangelog()

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface-secondary)]">
      <Sidebar />

      <div className="flex flex-1 flex-col md:pl-[var(--sidebar-width)]">
        <TopBar
          onMenuClick={() => setMobileMenuOpen(true)}
          changelogNew={hasNew}
          onChangelogClick={() => setChangelogOpen(true)}
        />

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      <MobileDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </div>
  )
}
