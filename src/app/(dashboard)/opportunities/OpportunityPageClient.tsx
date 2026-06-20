"use client"

import { useState } from "react"
import { FilterSidebar } from "@/components/opportunities/FilterSidebar"
import { OpportunityList } from "@/components/opportunities/OpportunityList"
import { ProposalModal } from "@/components/proposals/ProposalModal"

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

interface OpportunityModalData {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  budget_currency: string | null
  budget_type: string | null
  required_skills: string[] | null
  post_url: string
  ai_score: number | null
  ai_score_breakdown: Record<string, number> | null
  platform_name: string
  platform_logo_url: string | null
  poster_name: string | null
  poster_company: string | null
  posted_at: string | null
}

interface OpportunityPageClientProps {
  initialOpportunities: OpportunityRaw[]
  totalCount: number
  platforms: Platform[]
  userId: string
  lastSyncAt: string
  productId: string
}

export function OpportunityPageClient({
  initialOpportunities,
  totalCount,
  platforms,
  userId,
  lastSyncAt,
  productId,
}: OpportunityPageClientProps) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityModalData | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  function handleGenerateProposal(id: string) {
    const raw = initialOpportunities.find((o) => o.id === id)
    if (!raw) return
    const opp = {
      id: raw.id,
      title: raw.title,
      description: raw.description,
      budget_min: raw.budget_min,
      budget_max: raw.budget_max,
      budget_currency: raw.budget_currency,
      budget_type: raw.budget_type,
      required_skills: raw.required_skills,
      post_url: raw.post_url,
      ai_score: raw.ai_score,
      ai_score_breakdown: raw.ai_score_breakdown,
      platform_name: raw.platforms?.name ?? "Unknown",
      platform_logo_url: raw.platforms?.logo_url ?? null,
      poster_name: raw.poster_name,
      poster_company: raw.poster_company,
      posted_at: raw.posted_at,
    }
    setSelectedOpportunity(opp)
    setModalOpen(true)
  }

  return (
    <div className="flex gap-8">
      <FilterSidebar platforms={platforms} totalCount={totalCount} />
      <OpportunityList
        initialOpportunities={initialOpportunities}
        totalCount={totalCount}
        platformFilters={platforms}
        userId={userId}
        lastSyncAt={lastSyncAt}
        onGenerateProposal={handleGenerateProposal}
      />
      <ProposalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        opportunity={selectedOpportunity}
        productId={productId}
        userId={userId}
      />
    </div>
  )
}
