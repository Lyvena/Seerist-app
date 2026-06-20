"use client"

import type { ReactNode } from "react"
import { FilterSidebar } from "@/components/opportunities/FilterSidebar"
import { OpportunityList } from "@/components/opportunities/OpportunityList"

interface Platform {
  id: string
  slug: string
  name: string
}

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

interface OpportunityPageClientProps {
  initialOpportunities: OpportunityRaw[]
  totalCount: number
  platforms: Platform[]
  userId: string
  lastSyncAt: string
}

export function OpportunityPageClient({
  initialOpportunities,
  totalCount,
  platforms,
  userId,
  lastSyncAt,
}: OpportunityPageClientProps) {
  return (
    <div className="flex gap-8">
      <FilterSidebar platforms={platforms} totalCount={totalCount} />
      <OpportunityList
        initialOpportunities={initialOpportunities}
        totalCount={totalCount}
        platformFilters={platforms}
        userId={userId}
        lastSyncAt={lastSyncAt}
      />
    </div>
  )
}
