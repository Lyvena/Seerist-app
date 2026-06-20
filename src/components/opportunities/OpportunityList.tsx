"use client"

import { useEffect, useRef, useState } from "react"
import { useQueryState } from "nuqs"
import { RefreshCw, LayoutList, LayoutGrid, Loader2, Search, Radio, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OpportunityCard } from "./OpportunityCard"
import { SkeletonCard } from "./SkeletonCard"

type ViewMode = "list" | "grid"

const PAGE_SIZE = 20

interface OpportunityRaw {
  id: string
  title: string
  description: string
  poster_name: string | null
  poster_company: string | null
  post_url: string
  budget_min: number | null
  budget_max: number | null
  budget_currency: string | null
  budget_type: string | null
  required_skills: string[] | null
  platform_id: string
  ai_score: number | null
  ai_score_breakdown: Record<string, number> | null
  status: string | null
  is_starred: boolean | null
  posted_at: string | null
  platforms: { slug: string; name: string; logo_url: string | null } | null
}

interface OpportunityListProps {
  initialOpportunities: OpportunityRaw[]
  totalCount: number
  platformFilters: { id: string; slug: string; name: string }[]
  userId: string
  lastSyncAt: string
  onGenerateProposal: (id: string) => void
}

export function OpportunityList({
  initialOpportunities,
  totalCount,
  platformFilters,
  userId,
  lastSyncAt,
  onGenerateProposal,
}: OpportunityListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list"
    return (localStorage.getItem("seerist-view-mode") as ViewMode) ?? "list"
  })

  const [opportunities, setOpportunities] = useState<OpportunityRaw[]>(initialOpportunities)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncTime, setSyncTime] = useState(lastSyncAt)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [platformFilter] = useQueryState("platforms", { defaultValue: "" })
  const [scoreMin] = useQueryState("score_min", { defaultValue: "60" })
  const [scoreMax] = useQueryState("score_max", { defaultValue: "100" })
  const [budgetMin] = useQueryState("budget_min", { defaultValue: "" })
  const [budgetMax] = useQueryState("budget_max", { defaultValue: "" })
  const [budgetType] = useQueryState("budget_type", { defaultValue: "" })
  const [statusFilter] = useQueryState("status", { defaultValue: "" })
  const [dateRange] = useQueryState("date", { defaultValue: "" })
  const [starredOnly] = useQueryState("starred", { defaultValue: "" })
  const [sortBy] = useQueryState("sort", { defaultValue: "score" })

  function changeView(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem("seerist-view-mode", mode)
  }

  const hasActiveFilters = !!(platformFilter || scoreMin !== "60" || scoreMax !== "100" || budgetMin || budgetMax || budgetType || statusFilter || dateRange || starredOnly || sortBy !== "score")

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          setLoading(true)
          setPage((p) => p + 1)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading])

  // Reload data when filters change
  useEffect(() => {
    setOpportunities(initialOpportunities)
    setPage(1)
  }, [initialOpportunities])

  // Sync time counter
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(syncTime).getTime()) / 1000)
      if (diff < 60) return
    }, 10000)
    return () => clearInterval(interval)
  }, [syncTime])

  const enrichedOpportunities = opportunities.map((opp) => ({
    ...opp,
    platform_slug: opp.platforms?.slug ?? "",
    platform_name: opp.platforms?.name ?? "Unknown",
    platform_logo_url: opp.platforms?.logo_url ?? null,
  }))

  const hasMore = enrichedOpportunities.length < totalCount

  function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  function handleGenerateProposal(id: string) {
    onGenerateProposal(id)
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">{totalCount}</span> opportunities
          </p>
          <span className="text-xs text-[var(--text-muted)]">
            Last synced: <time dateTime={syncTime}>{timeAgo(syncTime)}</time>
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setSyncing(true)
              setTimeout(() => {
                setSyncTime(new Date().toISOString())
                setSyncing(false)
              }, 1500)
            }}
            disabled={syncing}
            className="gap-1 text-[var(--text-muted)]"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => changeView("list")}
            className={viewMode === "list" ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"}
            aria-label="List view"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => changeView("grid")}
            className={viewMode === "grid" ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {enrichedOpportunities.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-tertiary)]">
            {hasActiveFilters ? (
              <SlidersHorizontal className="h-6 w-6 text-[var(--text-muted)]" />
            ) : platformFilters.length === 0 ? (
              <Radio className="h-6 w-6 text-[var(--text-muted)]" />
            ) : (
              <Search className="h-6 w-6 text-[var(--text-muted)]" />
            )}
          </div>
          <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
            {hasActiveFilters
              ? "No matching opportunities"
              : platformFilters.length === 0
              ? "Set up platforms to start discovering"
              : "No opportunities found"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
            {hasActiveFilters
              ? "Try relaxing your filters"
              : platformFilters.length === 0
              ? "Configure platforms in Settings to begin scanning for matching opportunities."
              : "We haven't found any opportunities yet. Make sure your product is properly configured."}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                Array.from(params.keys()).forEach((k) => params.delete(k))
                window.history.replaceState(null, "", `/app/opportunities${params.toString() ? `?${params.toString()}` : ""}`)
                window.location.reload()
              }}
              className="mt-4"
            >
              Reset filters
            </Button>
          )}
        </div>
      )}

      <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2" : "space-y-3"}>
        {enrichedOpportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            userId={userId}
            onGenerateProposal={handleGenerateProposal}
          />
        ))}
      </div>

      {loading && (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 mt-4" : "space-y-3 mt-4"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />

      {enrichedOpportunities.length >= PAGE_SIZE && hasMore && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
        </div>
      )}
    </div>
  )
}
