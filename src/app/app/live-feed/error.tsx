"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">Something went wrong</h2>
      <p className="mt-1.5 max-w-md text-sm text-[var(--text-muted)]">
        {error.message || "An unexpected error occurred while loading the live feed."}
      </p>
      <Button variant="default" className="mt-6 gap-2" onClick={reset}>
        <RotateCcw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  )
}
