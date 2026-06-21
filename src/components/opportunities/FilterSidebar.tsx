"use client"

import { useQueryState } from "nuqs"

const STATUS_OPTIONS = ["new", "viewed", "proposing", "proposed"]
const DATE_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]
const SORT_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "posted_at", label: "Date" },
  { value: "budget_max", label: "Budget" },
]

interface FilterSidebarProps {
  platforms: { id: string; slug: string; name: string }[]
  totalCount: number
}

export function FilterSidebar({ platforms, totalCount }: FilterSidebarProps) {
  const [platformFilter, setPlatformFilter] = useQueryState("platforms", { defaultValue: "", parse: (v) => v })
  const [scoreMin, setScoreMin] = useQueryState("score_min", { defaultValue: "60", parse: (v) => v })
  const [scoreMax, setScoreMax] = useQueryState("score_max", { defaultValue: "100", parse: (v) => v })
  const [budgetMin, setBudgetMin] = useQueryState("budget_min", { defaultValue: "", parse: (v) => v })
  const [budgetMax, setBudgetMax] = useQueryState("budget_max", { defaultValue: "", parse: (v) => v })
  const [budgetType, setBudgetType] = useQueryState("budget_type", { defaultValue: "", parse: (v) => v })
  const [statusFilter, setStatusFilter] = useQueryState("status", { defaultValue: "", parse: (v) => v })
  const [dateRange, setDateRange] = useQueryState("date", { defaultValue: "", parse: (v) => v })
  const [starredOnly, setStarredOnly] = useQueryState("starred", { defaultValue: "", parse: (v) => v })
  const [sortBy, setSortBy] = useQueryState("sort", { defaultValue: "score", parse: (v) => v })

  const selectedPlatforms = platformFilter ? platformFilter.split(",") : []
  const selectedStatuses = statusFilter ? statusFilter.split(",") : []

  function togglePlatform(slug: string) {
    const next = selectedPlatforms.includes(slug)
      ? selectedPlatforms.filter((s) => s !== slug)
      : [...selectedPlatforms, slug]
    setPlatformFilter(next.length > 0 ? next.join(",") : null)
  }

  function toggleStatus(status: string) {
    const next = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status]
    setStatusFilter(next.length > 0 ? next.join(",") : null)
  }

  function resetFilters() {
    setPlatformFilter(null)
    setScoreMin(null)
    setScoreMax(null)
    setBudgetMin(null)
    setBudgetMax(null)
    setBudgetType(null)
    setStatusFilter(null)
    setDateRange(null)
    setStarredOnly(null)
    setSortBy(null)
  }

  return (
    <aside className="w-[180px] shrink-0 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">Filters</h2>
        <button onClick={resetFilters} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          Reset
        </button>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium text-[var(--text-primary)]">Sort</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value === "score" ? null : e.target.value)}
          className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium text-[var(--text-primary)]">Platform</label>
        <div className="space-y-0.5 max-h-40 overflow-y-auto scrollbar-thin">
          {platforms.map((p) => (
            <label key={p.id} className="flex items-center gap-1.5 cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(p.slug)}
                onChange={() => togglePlatform(p.slug)}
                className="rounded border-[var(--border-primary)] text-[var(--brand-primary)] h-3 w-3"
              />
              <span className="text-[10px] text-[var(--text-secondary)] truncate">{p.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium text-[var(--text-primary)]">Score</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={100}
            value={scoreMin}
            onChange={(e) => setScoreMin(e.target.value || null)}
            className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-primary)] px-1.5 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
            placeholder="0"
          />
          <span className="text-[10px] text-[var(--text-muted)]">–</span>
          <input
            type="number"
            min={0}
            max={100}
            value={scoreMax}
            onChange={(e) => setScoreMax(e.target.value || null)}
            className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-primary)] px-1.5 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
            placeholder="100"
          />
        </div>
      </div>

      {(budgetMin || budgetMax || budgetType) && (
        <div>
          <label className="mb-1 block text-[10px] font-medium text-[var(--text-primary)]">Budget</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value || null)}
              className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-primary)] px-1.5 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              placeholder="Min"
            />
            <input
              type="number"
              min={0}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value || null)}
              className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-primary)] px-1.5 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              placeholder="Max"
            />
          </div>
          <select
            value={budgetType}
            onChange={(e) => setBudgetType(e.target.value || null)}
            className="mt-1 w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
          >
            <option value="">All types</option>
            <option value="hourly">Hourly</option>
            <option value="fixed">Fixed</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-[10px] font-medium text-[var(--text-primary)]">Status</label>
        <div className="space-y-0.5">
          {STATUS_OPTIONS.map((s) => (
            <label key={s} className="flex items-center gap-1.5 cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={selectedStatuses.includes(s)}
                onChange={() => toggleStatus(s)}
                className="rounded border-[var(--border-primary)] text-[var(--brand-primary)] h-3 w-3"
              />
              <span className="text-[10px] capitalize text-[var(--text-secondary)]">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium text-[var(--text-primary)]">Date</label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value || null)}
          className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
        >
          {DATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={starredOnly === "true"}
          onChange={(e) => setStarredOnly(e.target.checked ? "true" : null)}
          className="rounded border-[var(--border-primary)] text-[var(--brand-primary)] h-3 w-3"
        />
        <span className="text-[10px] font-medium text-[var(--text-primary)]">Starred</span>
      </label>

      <div className="pt-2 border-t border-[var(--border-primary)]">
        <p className="text-[10px] text-[var(--text-muted)]">{totalCount} results</p>
      </div>
    </aside>
  )
}