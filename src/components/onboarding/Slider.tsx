"use client"

import { cn } from "@/lib/utils"

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  helperText?: string
  showValue?: boolean
}

export function Slider({ label, value, onChange, min, max, step = 1, helperText, showValue = true }: SliderProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-[var(--text-primary)]">{label}</label>
        {showValue && (
          <span className="text-sm font-mono text-[var(--brand-primary)] tabular-nums">{value}</span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "w-full h-2 bg-[var(--surface-tertiary)] rounded-lg appearance-none cursor-pointer",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--brand-primary)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md",
          "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--brand-primary)] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
        )}
      />
      {helperText && <p className="mt-1.5 text-sm text-[var(--text-muted)]">{helperText}</p>}
    </div>
  )
}
