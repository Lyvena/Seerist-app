"use client"

import { useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

const LS_KEY = "seerist-tour-done"

const STEPS = [
  { target: "", title: "Welcome to Seerist!", description: "Let's take a quick tour of your dashboard." },
  { target: "[href='/opportunities']", title: "Opportunities Feed", description: "Discover and score new freelance opportunities from 14+ platforms." },
  { target: "[href='/analytics']", title: "Analytics", description: "Track performance metrics and see which platforms perform best." },
  { target: "[href='/pipeline']", title: "Pipeline", description: "Manage your deals through the sales pipeline with drag-and-drop." },
  { target: "[data-tour='proposals']", title: "Proposals", description: "Generate AI-powered proposals with a single click." },
  { target: "[href='/platforms']", title: "Platforms", description: "Configure which platforms to monitor and set scoring thresholds." },
]

export function useTour() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(LS_KEY)
    if (!done) {
      const timer = setTimeout(() => setActive(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(LS_KEY, "true")
    setActive(false)
  }, [])

  return { active, dismiss }
}

export function TourOverlay({ active, onDismiss }: { active: boolean; onDismiss: () => void }) {
  const [step, setStep] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!active) return
    const stepData = STEPS[step]
    if (step === 0 || !stepData.target) {
      setPosition({ top: 80, left: 24 })
      return
    }
    const el = document.querySelector(stepData.target) as HTMLElement | null
    if (el) {
      const rect = el.getBoundingClientRect()
      setPosition({ top: rect.bottom + 12, left: rect.left })
    }
  }, [step, active])

  if (!active) return null

  const stepData = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onDismiss} />
      <div
        className="fixed z-50 w-72 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-4 shadow-xl"
        style={{ top: position.top, left: Math.max(16, position.left) }}
      >
        <button
          onClick={onDismiss}
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)]"
          aria-label="Dismiss tour"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <p className="text-xs font-semibold text-[var(--brand-primary)]">
          Step {step + 1} of {STEPS.length}
        </p>
        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{stepData.title}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{stepData.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-[var(--brand-primary)]" : "bg-[var(--surface-tertiary)]"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {!isLast ? (
              <Button variant="default" size="sm" onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={onDismiss}>
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
