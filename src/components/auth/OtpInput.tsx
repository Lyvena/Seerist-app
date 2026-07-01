"use client"

import { useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
}

/**
 * N separate single-digit boxes with auto-advance, paste support, and
 * backspace-to-go-back. Controlled via a single `value` string.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled,
  autoFocus,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setDigit = useCallback(
    (index: number, digit: string) => {
      const chars = value.padEnd(length, " ").split("")
      chars[index] = digit
      const next = chars.join("").replace(/\s+$/, "")
      onChange(next.slice(0, length))
    },
    [value, length, onChange]
  )

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1)
    if (!digit) return
    setDigit(index, digit)
    if (index < length - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[index]) {
        setDigit(index, "")
      } else if (index > 0) {
        refs.current[index - 1]?.focus()
        setDigit(index - 1, "")
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (pasted) {
      onChange(pasted)
      const focusIndex = Math.min(pasted.length, length - 1)
      refs.current[focusIndex]?.focus()
    }
  }

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          className={cn(
            "h-12 w-12 rounded-lg border bg-[var(--surface-primary)] text-center text-lg font-semibold text-[var(--text-primary)] outline-none transition-colors",
            "border-[var(--border-primary)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        />
      ))}
    </div>
  )
}
