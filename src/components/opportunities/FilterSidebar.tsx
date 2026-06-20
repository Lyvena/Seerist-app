"use client"

import { useQueryState } from "nuqs"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

const STATUS_OPTIONS = ["new", "viewed", "proposing", "proposed"]
const DATE_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]
const SORT_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "posted_at", label: "Date posted" },
  { value: "budget_max", label: "Budget (high to low)" },
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
    <aside className="w-[200px] shrink-0 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase">Filters</h2>
        <Button variant="ghost" size="xs" onClick={resetFilters} className="gap-1 text-[11px] text-[var(--text-muted)]">
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-[var(--text-primary)]">Sort by</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value === "score" ? null : e.target.value)}
          className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-[var(--text-primary)]">Platform</label>
        <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
          {platforms.map((p) => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(p.slug)}
                onChange={() => togglePlatform(p.slug)}
                className="rounded border-[var(--border-primary)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary-light)] h-3.5 w-3.5"
              />
              <span className="text-xs text-[var(--text-secondary)]">{p.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-[var(--text-primary)]">Score range</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={scoreMin}
            onChange={(e) => setScoreMin(e.target.value || null)}
            className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            placeholder="0"
          />
          <span className="text-xs text-[var(--text-muted)]">–</span>
          <input
            type="number"
            min={0}
            max={100}
            value={scoreMax}
            onChange={(e) => setScoreMax(e.target.value || null)}
            className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            placeholder="100"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-[var(--text-primary)]">Budget</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value || null)}
              className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              placeholder="Min"
            />
            <input
              type="number"
              min={0}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value || null)}
              className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              placeholder="Max"
            />
          </div>
          <select
            value={budgetType}
            onChange={(e) => setBudgetType(e.target.value || null)}
            className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          >
            <option value="">All types</option>
            <option value="hourly">Hourly</option>
            <option value="fixed">Fixed</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-[var(--text-primary)]">Status</label>
        <div className="space-y-1">
          {STATUS_OPTIONS.map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={selectedStatuses.includes(s)}
                onChange={() => toggleStatus(s)}
                className="rounded border-[var(--border-primary)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary-light)] h-3.5 w-3.5"
              />
              <span className="text-xs capitalize text-[var(--text-secondary)]">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-[var(--text-primary)]">Date posted</label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value || null)}
          className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        >
          {DATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={starredOnly === "true"}
          onChange={(e) => setStarredOnly(e.target.checked ? "true" : null)}
          className="rounded border-[var(--border-primary)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary-light)] h-3.5 w-3.5"
        />
        <span className="text-xs font-medium text-[var(--text-primary)]">Starred only</span>
      </label>
    </aside>
  )
}
