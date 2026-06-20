import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
