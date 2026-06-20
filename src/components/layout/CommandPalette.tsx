"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { Search, Zap, Radio, KanbanSquare, Trophy, FileText, Cpu, Package, Globe, Settings2, ArrowRight } from "lucide-react"

interface Action {
  id: string
  label: string
  href: string
  icon: React.ElementType
  category: string
}

const ACTIONS: Action[] = [
  { id: "opportunities", label: "View Opportunities", href: "/opportunities", icon: Zap, category: "Navigate" },
  { id: "live-feed", label: "View Live Feed", href: "/app/live-feed", icon: Radio, category: "Navigate" },
  { id: "pipeline", label: "View My Pipeline", href: "/app/pipeline", icon: KanbanSquare, category: "Navigate" },
  { id: "won-deals", label: "View Won Deals", href: "/app/won-deals", icon: Trophy, category: "Navigate" },
  { id: "proposal", label: "Generate Proposal", href: "/app/proposal-generator", icon: FileText, category: "Navigate" },
  { id: "ai-settings", label: "AI Settings", href: "/app/ai-settings", icon: Cpu, category: "Navigate" },
  { id: "products", label: "My Products", href: "/app/products", icon: Package, category: "Navigate" },
  { id: "platforms", label: "Platforms", href: "/app/platforms", icon: Globe, category: "Navigate" },
  { id: "settings", label: "Settings", href: "/app/settings", icon: Settings2, category: "Navigate" },
]

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[var(--brand-primary-light)] text-[var(--brand-primary)] rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = query.trim()
    ? ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : ACTIONS

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery("")
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

  function handleSelect(action: Action) {
    onOpenChange(false)
    router.push(action.href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex])
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          onKeyDown={onKeyDown}
          className="fixed left-1/2 top-[15vh] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] shadow-dropdown data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="flex items-center gap-3 border-b border-[var(--border-primary)] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search opportunities or actions..."
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              ESC
            </kbd>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 && (
              <p className="p-4 text-center text-sm text-[var(--text-muted)]">No results found</p>
            )}

            {filtered.length > 0 && <p className="px-2 pb-1 pt-2 text-[11px] font-semibold text-[var(--text-muted)]">Navigate</p>}

            {filtered.map((action, idx) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                    idx === selectedIndex
                      ? "bg-[var(--brand-primary-light)] text-[var(--brand-primary)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{highlightMatch(action.label, query)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </button>
              )
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
