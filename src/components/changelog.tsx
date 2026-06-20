"use client"

import { useEffect, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const CHANGELOG_VERSION = "1.0.0"
const LS_KEY = "seerist-changelog-seen"

const CHANGES = [
  { date: "June 2026", title: "Live Feed", description: "Real-time opportunity feed with InsForge Realtime subscriptions." },
  { date: "June 2026", title: "AI Settings", description: "Custom model selection, BYOK, and proposal preferences." },
  { date: "June 2026", title: "Email Notifications", description: "Real-time alerts, daily/weekly digests, and notification bell." },
  { date: "June 2026", title: "Billing & Plans", description: "Checkout flow, plan limits, and subscription management." },
  { date: "May 2026", title: "Analytics Dashboard", description: "Charts, platform performance, and revenue metrics." },
  { date: "May 2026", title: "Pipeline Kanban", description: "Drag-and-drop deal management with 6 stages." },
  { date: "May 2026", title: "Proposal Generation", description: "AI-powered proposal drafting with tone/word controls." },
  { date: "May 2026", title: "Opportunity Scoring", description: "AI scoring with relevance, budget, and timing dimensions." },
]

export function useChangelog() {
  const [hasNew, setHasNew] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(LS_KEY)
    if (seen !== CHANGELOG_VERSION) {
      setHasNew(true)
    }
  }, [])

  function markSeen() {
    localStorage.setItem(LS_KEY, CHANGELOG_VERSION)
    setHasNew(false)
  }

  return { hasNew, open, setOpen, markSeen }
}

export function ChangelogModal({
  open,
  onOpenChange,
  onClose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6 shadow-xl max-h-[80vh] flex flex-col"
          aria-label="What's new"
        >
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
                <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-[var(--text-primary)]">What&apos;s New</Dialog.Title>
                <p className="text-xs text-[var(--text-muted)]">Latest updates to Seerist</p>
              </div>
            </div>
            <button
              onClick={() => { onOpenChange(false); onClose() }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)]"
              aria-label="Close changelog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
            {CHANGES.map((change, i) => (
              <div key={i} className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-[var(--text-muted)]">{change.date}</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{change.title}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{change.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 shrink-0 flex justify-end">
            <Button variant="default" size="sm" onClick={() => { onOpenChange(false); onClose() }}>
              Got it
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
