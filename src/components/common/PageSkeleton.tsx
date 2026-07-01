import { Skeleton } from "@/components/ui/skeleton"

/**
 * Shared page-level loading skeleton. Used by route `loading.tsx` files to
 * avoid hand-rolling a bespoke layout per route. Variants mirror the broad
 * shape of each page so the transition feels native.
 */
type Variant = "dashboard" | "list" | "grid" | "kanban" | "table" | "detail"

interface PageSkeletonProps {
  variant?: Variant
}

export function PageSkeleton({ variant = "list" }: PageSkeletonProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {variant === "dashboard" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-64 rounded-xl lg:col-span-2" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </>
      )}

      {variant === "list" && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {variant === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {variant === "kanban" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-7 w-28 rounded-md" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-24 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      )}

      {variant === "table" && (
        <Skeleton className="h-96 rounded-xl" />
      )}

      {variant === "detail" && (
        <Skeleton className="h-[60vh] rounded-xl" />
      )}
    </div>
  )
}
