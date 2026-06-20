"use client"

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <p className="text-sm text-[var(--text-muted)]">
      Step {currentStep} of {totalSteps}
    </p>
  )
}
