"use client"

import { useState, useRef, useEffect, KeyboardEvent } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TagInputProps {
  label: string
  value: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  placeholder?: string
  error?: string
  helperText?: string
}

export function TagInput({ label, value, onChange, maxTags = 10, placeholder, error, helperText }: TagInputProps) {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const tagId = label.toLowerCase().replace(/\s+/g, "-")

  const addTag = () => {
    const tag = inputValue.trim()
    if (tag && !value.includes(tag) && value.length < maxTags) {
      onChange([...value, tag])
      setInputValue("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((t) => t !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  const handleBlur = () => {
    addTag()
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        {label}
      </label>
      <div
        className={cn(
          "flex flex-wrap gap-2 rounded-lg border bg-[var(--surface-primary)] px-3 py-2 min-h-[44px] transition-colors",
          error
            ? "border-[var(--status-danger)] focus-within:ring-2 focus-within:ring-[var(--status-danger-light)] focus-within:border-transparent"
            : "border-[var(--border-primary)] hover:border-[var(--text-muted)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)] focus-within:border-transparent"
        )}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--brand-primary)]">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="p-0.5 hover:bg-[var(--brand-primary)] hover:text-white rounded-full transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length >= maxTags ? undefined : placeholder}
          disabled={value.length >= maxTags}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] disabled:opacity-50"
          aria-label={`Add ${label.toLowerCase()}`}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-[var(--status-danger)]" role="alert">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-[var(--text-muted)]">{helperText}</p>}
      <p className="mt-1.5 text-xs text-[var(--text-muted)]">{value.length}/{maxTags} tags</p>
    </div>
  )
}
