"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { MobileDrawer } from "@/components/layout/MobileDrawer"
import { AuthProvider } from "@/components/auth/AuthProvider"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--surface-secondary)]">
        <Sidebar />

        <div className="flex flex-1 flex-col md:pl-[var(--sidebar-width)]">
          <TopBar onMenuClick={() => setMobileMenuOpen(true)} />

          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="mx-auto w-full max-w-7xl px-4 py-4 lg:px-6">
              {children}
            </div>
          </main>
        </div>

        <MobileDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      </div>
    </AuthProvider>
  )
}