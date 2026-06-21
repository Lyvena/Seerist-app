"use client"

import { useAuth } from "./AuthProvider"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, User, Settings, LogOut, CreditCard } from "lucide-react"

export function UserMenu() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  if (!user) return null

  const initials = user.email
    ?.split("@")[0]
    ?.slice(0, 2)
    ?.toUpperCase() ?? "U"

  const plan = profile?.plan ?? "free"

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-[var(--surface-tertiary)] transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-semibold text-white">
          {initials}
        </div>
        <span className="hidden sm:inline text-[var(--text-secondary)]">
          {user.email}
        </span>
        <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-1 shadow-lg z-50">
          <div className="px-3 py-2 border-b border-[var(--border-primary)]">
            <p className="text-sm font-medium">{user.email}</p>
            <p className="text-xs text-[var(--text-muted)] capitalize">{plan} plan</p>
          </div>
          <button
            onClick={() => { setOpen(false); router.push("/settings/profile") }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--surface-tertiary)] rounded-lg"
          >
            <User className="h-4 w-4" />
            Profile
          </button>
          <button
            onClick={() => { setOpen(false); router.push("/settings") }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--surface-tertiary)] rounded-lg"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={() => { setOpen(false); router.push("/settings/billing") }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--surface-tertiary)] rounded-lg"
          >
            <CreditCard className="h-4 w-4" />
            Billing
          </button>
          <button
            onClick={async () => { setOpen(false); await signOut(); router.push("/login") }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left text-[var(--status-danger)] hover:bg-[var(--surface-tertiary)] rounded-lg"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}