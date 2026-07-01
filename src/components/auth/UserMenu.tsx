"use client"

import { useAuth } from "./AuthProvider"
import { useRouter } from "next/navigation"
import { ChevronDown, User, Settings, LogOut, CreditCard } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

export function UserMenu() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()

  if (!user) return null

  const initials = user.email
    ?.split("@")[0]
    ?.slice(0, 2)
    ?.toUpperCase() ?? "U"

  const plan = profile?.plan ?? "free"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-[var(--surface-tertiary)] transition-colors">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-semibold text-white">
            {initials}
          </div>
          <span className="hidden sm:inline text-[var(--text-secondary)] max-w-[120px] truncate">
            {user.email}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-0">
        <div className="px-3 py-3 border-b border-[var(--border-secondary)]">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user.email}</p>
          <p className="text-xs text-[var(--text-muted)] capitalize">{plan} plan</p>
        </div>
        <div className="p-1">
          <MenuRow icon={User} label="Profile" onClick={() => router.push("/settings/profile")} />
          <MenuRow icon={Settings} label="Settings" onClick={() => router.push("/settings")} />
          <MenuRow icon={CreditCard} label="Billing" onClick={() => router.push("/settings/billing")} />
        </div>
        <div className="border-t border-[var(--border-secondary)] p-1">
          <MenuRow
            icon={LogOut}
            label="Sign out"
            danger
            onClick={async () => {
              await signOut()
              router.push("/login")
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-[var(--surface-tertiary)] data-[danger]:text-[var(--status-danger)]"
      data-danger={danger ? "" : undefined}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
