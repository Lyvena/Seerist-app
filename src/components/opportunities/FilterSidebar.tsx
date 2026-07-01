"use client"

import { useQueryState } from "nuqs"
import { cn } from "@/lib/utils"
import { Star } from "lucide-react"

const STATUS_OPTIONS = ["new", "viewed", "proposing", "proposed"]
const DATE_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]
const SORT_OPTIONS = [
  { value: "score", label: "Match score" },
  { value: "posted_at", label: "Date posted" },
  { value: "budget_max", label: "Budget" },
]

const inputCls =
  "w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"

const checkboxCls =
  "rounded border-[var(--border-strong)] text-[var(--brand-primary)] h-4 w-4 focus:ring-1 focus:ring-[var(--brand-primary)] cursor-pointer"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
      {children}
    </label>
  )
}

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

  const activeFilterCount =
    (platformFilter ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (budgetMin || budgetMax || budgetType ? 1 : 0) +
    (dateRange ? 1 : 0) +
    (starredOnly === "true" ? 1 : 0)

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
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[10px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </h2>
        {activeFilterCount > 0 && (
          <button onClick={resetFilters} className="text-[11px] text-[var(--brand-primary)] hover:underline">
            Reset
          </button>
        )}
      </div>

      <div>
        <SectionLabel>Sort by</SectionLabel>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value === "score" ? null : e.target.value)}
          className={inputCls}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <SectionLabel>Platform</SectionLabel>
        <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin">
          {platforms.map((p) => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(p.slug)}
                onChange={() => togglePlatform(p.slug)}
                className={checkboxCls}
              />
              <span className="text-xs text-[var(--text-secondary)] truncate">{p.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Match score</SectionLabel>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={100}
            value={scoreMin}
            onChange={(e) => setScoreMin(e.target.value || null)}
            className={inputCls}
            placeholder="0"
          />
          <span className="text-xs text-[var(--text-faint)]">–</span>
          <input
            type="number"
            min={0}
            max={100}
            value={scoreMax}
            onChange={(e) => setScoreMax(e.target.value || null)}
            className={inputCls}
            placeholder="100"
          />
        </div>
      </div>

      <div>
        <SectionLabel>Budget</SectionLabel>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value || null)}
            className={inputCls}
            placeholder="Min $"
          />
          <input
            type="number"
            min={0}
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value || null)}
            className={inputCls}
            placeholder="Max $"
          />
        </div>
        <select
          value={budgetType}
          onChange={(e) => setBudgetType(e.target.value || null)}
          className={cn(inputCls, "mt-1.5")}
        >
          <option value="">All budget types</option>
          <option value="hourly">Hourly</option>
          <option value="fixed">Fixed</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div>
        <SectionLabel>Status</SectionLabel>
        <div className="space-y-1.5">
          {STATUS_OPTIONS.map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedStatuses.includes(s)}
                onChange={() => toggleStatus(s)}
                className={checkboxCls}
              />
              <span className="text-xs capitalize text-[var(--text-secondary)]">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Date posted</SectionLabel>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value || null)}
          className={inputCls}
        >
          {DATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setStarredOnly(starredOnly === "true" ? null : "true")}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
          starredOnly === "true"
            ? "border-[var(--brand-primary-border)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)]"
            : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
        )}
      >
        <Star className={cn("h-3.5 w-3.5", starredOnly === "true" && "fill-current")} />
        Starred only
      </button>

      <div className="border-t border-[var(--border-secondary)] pt-3">
        <p className="text-xs text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-primary)]">{totalCount}</span> result{totalCount === 1 ? "" : "s"}
        </p>
      </div>
    </aside>
  )
}
