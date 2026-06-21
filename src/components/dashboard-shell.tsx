"use client"

import { useState, useCallback } from "react"
import { useKeyboardShortcuts, KeyboardShortcutsModal } from "@/components/keyboard-shortcuts"
import { useChangelog, ChangelogModal } from "@/components/changelog"
import { useTour, TourOverlay } from "@/components/tour"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const { hasNew, open: changelogOpen, setOpen: setChangelogOpen, markSeen } = useChangelog()
  const { active: tourActive, dismiss: dismissTour } = useTour()

  const handleShortcutAction = useCallback((action: string) => {
    if (action === "help") setShortcutsOpen(true)
  }, [])

  useKeyboardShortcuts({ onAction: handleShortcutAction })

  return (
    <>
      {children}
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ChangelogModal open={changelogOpen} onOpenChange={setChangelogOpen} onClose={markSeen} />
      <TourOverlay active={tourActive} onDismiss={dismissTour} />
    </>
  )
}
