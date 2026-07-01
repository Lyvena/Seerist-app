"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { RefreshCw, LayoutList, LayoutGrid, Zap, SlidersHorizontal, Search, Radio, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OpportunityCard } from "./OpportunityCard"
import { SkeletonCard } from "./SkeletonCard"
import { timeAgo } from "@/lib/format"

type ViewMode = "list" | "grid"

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
  currentPage: number
  pageSize: number
  onGenerateProposal: (id: string) => void
}

export function OpportunityList({
  initialOpportunities,
  totalCount,
  platformFilters,
  userId,
  lastSyncAt,
  currentPage,
  pageSize,
  onGenerateProposal,
}: OpportunityListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list"
    return (localStorage.getItem("seerist-view-mode") as ViewMode) ?? "list"
  })

  const [opportunities, setOpportunities] = useState<OpportunityRaw[]>(initialOpportunities)
  const [scoring, setScoring] = useState(false)

  const hasNoScore = useMemo(() => opportunities.some((o) => o.ai_score == null), [opportunities])

  const hasActiveFilters = (() => {
    if (typeof window === "undefined") return false
    const params = new URLSearchParams(window.location.search)
    return Array.from(params.keys()).some((k) => k !== "page")
  })()

  async function refreshScores() {
    if (!userId || scoring) return
    const idsWithoutScore = opportunities.filter((o) => o.ai_score == null).map((o) => o.id)
    if (idsWithoutScore.length === 0) return
    setScoring(true)

    const response = await fetch("/api/opportunities/score", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunity_ids: idsWithoutScore }),
    })

    if (response.ok) {
      const pollInterval = setInterval(async () => {
        const { insforgeBrowser } = await import("@/lib/insforge/client")
        const { data } = await insforgeBrowser().database
          .from("opportunities")
          .select("id, ai_score, ai_score_breakdown")
          .in("id", idsWithoutScore)
          .eq("user_id", userId)

        if (data && data.some((o: { ai_score: number | null }) => o.ai_score != null)) {
          setOpportunities((prev) =>
            prev.map((opp) => {
              const updated = data.find((o: { id: string }) => o.id === opp.id)
              return updated ? { ...opp, ai_score: updated.ai_score, ai_score_breakdown: updated.ai_score_breakdown } : opp
            })
          )
          if (data.every((o: { ai_score: number | null }) => o.ai_score != null)) {
            clearInterval(pollInterval)
            setScoring(false)
          }
        }
      }, 1000)

      setTimeout(() => { clearInterval(pollInterval); setScoring(false) }, 30000)
    } else {
      setScoring(false)
    }
  }

  function changeView(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem("seerist-view-mode", mode)
  }

  useEffect(() => {
    setOpportunities(initialOpportunities)
  }, [initialOpportunities])

  const enrichedOpportunities = opportunities.map((opp) => ({
    ...opp,
    platform_slug: opp.platforms?.slug ?? "",
    platform_name: opp.platforms?.name ?? "Unknown",
    platform_logo_url: opp.platforms?.logo_url ?? null,
  }))

  const showingCount = currentPage * pageSize
  const hasMore = showingCount < totalCount

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2" role="region" aria-label="Opportunity list controls">
        <div className="flex items-center gap-2">
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">{totalCount}</span> opportunities
          </p>
          <span className="text-xs text-[var(--text-muted)]">
            Last synced: <time dateTime={lastSyncAt}>{timeAgo(lastSyncAt)}</time>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {hasNoScore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshScores}
              loading={scoring}
              className="gap-1.5 text-[var(--brand-primary)]"
              aria-label={scoring ? "Scoring opportunities" : "Refresh AI scores"}
            >
              {!scoring && <Zap className="h-3.5 w-3.5" aria-hidden="true" />}
              {scoring ? "Scoring…" : "Score unscored"}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:ml-auto" role="toolbar" aria-label="View options">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => changeView("list")}
            className={viewMode === "list" ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"}
            aria-label="List view"
            aria-pressed={viewMode === "list"}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => changeView("grid")}
            className={viewMode === "grid" ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {enrichedOpportunities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center" role="status" aria-live="polite">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-light)]">
            {hasActiveFilters ? (
              <SlidersHorizontal className="h-6 w-6 text-[var(--brand-primary)]" aria-hidden="true" />
            ) : platformFilters.length === 0 ? (
              <Radio className="h-6 w-6 text-[var(--brand-primary)]" aria-hidden="true" />
            ) : (
              <Search className="h-6 w-6 text-[var(--brand-primary)]" aria-hidden="true" />
            )}
          </div>
          <h3 className="mt-4 font-cal text-base font-semibold text-[var(--text-primary)]">
            {hasActiveFilters
              ? "No matching opportunities"
              : platformFilters.length === 0
              ? "Set up platforms to start discovering"
              : "No opportunities found"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
            {hasActiveFilters
              ? "Try relaxing your filters to see more results."
              : platformFilters.length === 0
              ? "Configure platforms to begin scanning for matching opportunities."
              : "We haven't found any opportunities yet. Make sure your product is properly configured."}
          </p>
          {hasActiveFilters ? (
            <Link href="/opportunities" className="mt-5">
              <Button variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Reset filters
              </Button>
            </Link>
          ) : platformFilters.length === 0 ? (
            <Link href="/platforms" className="mt-5">
              <Button size="sm" className="gap-1.5">
                Configure platforms
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : null}
        </div>
      )}

      {enrichedOpportunities.length > 0 && (
        <>
          <div
            className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}
            role="list"
            aria-label="Opportunities"
          >
            {enrichedOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                userId={userId}
                onGenerateProposal={onGenerateProposal}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-xs text-[var(--text-muted)]">
                Showing {showingCount} of {totalCount}
              </p>
              <LoadMoreLink currentPage={currentPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Loads the next page by incrementing the URL `page` param (server-rendered). */
function LoadMoreLink({ currentPage }: { currentPage: number }) {
  const href = (() => {
    if (typeof window === "undefined") return `/opportunities?page=${currentPage + 1}`
    const params = new URLSearchParams(window.location.search)
    params.set("page", String(currentPage + 1))
    return `/opportunities?${params.toString()}`
  })()

  return (
    <Link href={href} prefetch>
      <Button variant="outline" size="sm" className="gap-1.5">
        Load more
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </Link>
  )
}
