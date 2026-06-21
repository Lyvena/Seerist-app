"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, ExternalLink } from "lucide-react"
import { insforgeBrowser } from "@/lib/insforge/client"
import { cn } from "@/lib/utils"

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
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

  const fetchNotifications = useCallback(async () => {
    const client = insforgeBrowser()
    const { data } = await client.database
      .from("notifications")
      .select("id, type, title, body, link, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(10)

    const items = (data ?? []) as NotificationItem[]
    setNotifications(items)
    setUnreadCount(items.filter((n) => !n.is_read).length)
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!open) return
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [open, fetchNotifications])

  async function markAllRead() {
    const client = insforgeBrowser()
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    for (const id of unreadIds) {
      await client.database.from("notifications").update({ is_read: true }).eq("id", id)
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  async function handleNotificationClick(n: NotificationItem) {
    const client = insforgeBrowser()
    if (!n.is_read) {
      await client.database.from("notifications").update({ is_read: true }).eq("id", n.id)
      setNotifications((prev) => prev.map((p) => (p.id === n.id ? { ...p, is_read: true } : p)))
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    if (n.link) router.push(n.link)
    setOpen(false)
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[9px] font-bold text-white ring-2 ring-[var(--surface-primary)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:underline">
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "w-full border-b border-[var(--border-primary)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-secondary)] last:border-b-0",
                    !n.is_read && "bg-[var(--brand-primary)]/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      !n.is_read ? "bg-[var(--brand-primary)]" : "bg-transparent"
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-sm truncate",
                        !n.is_read ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                      )}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{n.body}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(n.created_at)}</span>
                        {n.link && <ExternalLink className="h-3 w-3 text-[var(--text-muted)]" />}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
