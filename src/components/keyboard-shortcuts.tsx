"use client"

import { useEffect, useState, useCallback } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Keyboard, X } from "lucide-react"

const SHORTCUTS = [
  { key: "N", label: "New opportunity / Search focus" },
  { key: "P", label: "Generate proposal for selected" },
  { key: "S", label: "Skip current opportunity" },
  { key: "?", label: "Toggle keyboard shortcuts" },
  { key: "K", label: "Command palette", modifier: "⌘" },
]

type ShortcutAction = "new-opportunity" | "generate-proposal" | "skip" | "help"

interface UseKeyboardShortcutsOptions {
  onAction: (action: ShortcutAction) => void
}

export function useKeyboardShortcuts({ onAction }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        onAction("help")
        return
      }

      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        onAction("new-opportunity")
        return
      }

      if (e.key === "p" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        onAction("generate-proposal")
        return
      }

      if (e.key === "s" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        onAction("skip")
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onAction])
}

export function KeyboardShortcutsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6 shadow-xl"
          aria-label="Keyboard shortcuts"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-tertiary)]">
                <Keyboard className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-[var(--text-primary)]">
                  Keyboard Shortcuts
                </Dialog.Title>
                <p className="text-xs text-[var(--text-muted)]">Press ? to toggle this modal</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)]"
              aria-label="Close shortcuts"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {SHORTCUTS.map((s) => (
              <div key={s.key} className="flex items-center justify-between rounded-lg bg-[var(--surface-secondary)] px-3 py-2.5">
                <span className="text-sm text-[var(--text-secondary)]">{s.label}</span>
                <kbd className="inline-flex items-center gap-0.5 rounded-md border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                  {s.modifier && <span>{s.modifier}</span>}
                  <span>{s.key}</span>
                </kbd>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
