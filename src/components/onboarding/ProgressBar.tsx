"use client"

import { cn } from "@/lib/utils"

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  labels: string[]
}

export function ProgressBar({ currentStep, totalSteps, labels }: ProgressBarProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {labels.map((label, index) => (
          <div
            key={label}
            className="flex flex-col items-center flex-1 relative"
            style={{ maxWidth: index === 0 ? 0 : undefined }}
          >
            <div className="relative z-10">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                  index + 1 < currentStep
                    ? "bg-[var(--brand-primary)] text-white"
                    : index + 1 === currentStep
                    ? "bg-[var(--brand-primary)] text-white ring-4 ring-[var(--brand-primary-light)]"
                    : "bg-[var(--surface-tertiary)] text-[var(--text-muted)]"
                )}
              >
                {index + 1 < currentStep ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={cn("mt-2 text-xs font-medium text-center w-24", index + 1 <= currentStep ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
                {label}
              </span>
            </div>
            {index < totalSteps - 1 && (
              <div
                className={cn(
                  "absolute top-[21px] left-1/2 w-full h-1.5 -z-10",
                  index + 1 < currentStep
                    ? "bg-[var(--brand-primary)]"
                    : "bg-[var(--border-primary)]"
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--brand-primary)] transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
