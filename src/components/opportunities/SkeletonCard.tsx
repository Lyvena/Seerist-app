export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-[var(--surface-tertiary)]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-20 rounded bg-[var(--surface-tertiary)]" />
            <div className="h-4 w-3/4 rounded bg-[var(--surface-tertiary)]" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-[var(--surface-tertiary)] shrink-0" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-[var(--surface-tertiary)]" />
        <div className="h-3 w-5/6 rounded bg-[var(--surface-tertiary)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--surface-tertiary)]" />
      </div>
      <div className="mt-3 flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 w-14 rounded-md bg-[var(--surface-tertiary)]" />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-primary)] pt-3">
        <div className="h-8 w-8 rounded-lg bg-[var(--surface-tertiary)]" />
        <div className="h-8 w-32 rounded-lg bg-[var(--surface-tertiary)]" />
        <div className="h-8 w-16 rounded-lg bg-[var(--surface-tertiary)]" />
      </div>
    </div>
  )
}
