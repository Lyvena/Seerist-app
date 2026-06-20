import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center" role="status">
      <div
        className={cn(
          "animate-spin rounded-full border-[var(--border-primary)] border-t-[var(--brand-primary)]",
          sizeClasses[size],
          className
        )}
        aria-label="Loading"
      />
    </div>
  )
}
