"use client"

import { useState, memo, useMemo } from "react"
import Image from "next/image"
import {
  Star,
  Sparkles,
  ExternalLink,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScoreBadge } from "@/components/common/ScoreBadge"
import { timeAgo, formatBudget } from "@/lib/opportunities"
import { toggleStar, skipOpportunity, markViewed } from "@/app/actions/opportunities"

interface Opportunity {
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
  platform_slug: string
  platform_name: string
  platform_logo_url: string | null
  ai_score: number | null
  ai_score_breakdown: Record<string, number> | null
  status: string | null
  is_starred: boolean | null
  posted_at: string | null
}

interface OpportunityCardProps {
  opportunity: Opportunity
  userId: string
  onGenerateProposal: (id: string) => void
}

function OpportunityCardComponent({ opportunity, userId, onGenerateProposal }: OpportunityCardProps) {
  const [starred, setStarred] = useState(opportunity.is_starred ?? false)
  const [status, setStatus] = useState(opportunity.status ?? "new")
  const [skipping, setSkipping] = useState(false)

  const score = opportunity.ai_score ?? 0
  const skills = opportunity.required_skills ?? []
  const remainingSkills = skills.length > 3 ? skills.length - 3 : 0
  const isViewed = status === "viewed"
  const isProposed = status === "proposed"
  const isSkipped = status === "skipped"

  async function handleStar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const { error } = await toggleStar(opportunity.id, starred)
    if (!error) setStarred(!starred)
  }

  async function handleSkip(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setSkipping(true)
    const { error } = await skipOpportunity(opportunity.id)
    if (!error) setStatus("skipped")
    setSkipping(false)
  }

  function handleClick() {
    if (status === "new") {
      markViewed(opportunity.id)
      setStatus("viewed")
    }
  }

  function handleGenerate(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onGenerateProposal(opportunity.id)
  }

  if (isSkipped) {
    return (
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4 opacity-50" aria-roledescription="opportunity" aria-label={`${opportunity.title} - skipped`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-tertiary)]">
              <span className="text-xs font-semibold text-[var(--text-muted)]">?</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-[var(--text-primary)] line-through truncate">{opportunity.title}</h3>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">Skipped</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      role="article"
      aria-roledescription="opportunity"
      aria-label={`${opportunity.title}, score ${score}%`}
      onClick={handleClick}
      className={`group rounded-xl border bg-[var(--surface-primary)] p-4 transition-all hover:border-l-[var(--brand-primary)] hover:border-l-[3px] hover:shadow-card cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
        isViewed ? "bg-[var(--surface-secondary)]" : ""
      } ${isProposed ? "border-l-[var(--status-success)] border-l-[3px]" : ""}`}
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)] overflow-hidden">
            {opportunity.platform_logo_url ? (
              <Image src={opportunity.platform_logo_url} alt="" width={20} height={20} className="h-5 w-5 object-contain" unoptimized aria-hidden="true" />
            ) : (
              <span className="text-xs font-semibold text-[var(--text-secondary)]" aria-hidden="true">{opportunity.platform_name.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--text-muted)]">{opportunity.platform_name}</p>
            <h3 className="font-semibold text-xs text-[var(--text-primary)] line-clamp-2 leading-snug">{opportunity.title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isProposed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-success-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-success)]">
              <Sparkles className="h-3 w-3" />
              Proposal Sent
            </span>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ScoreBadge score={score} />
                </div>
              </TooltipTrigger>
<TooltipContent side="top" className="max-w-xs">
                 <div className="space-y-1.5">
                   <p className="font-semibold text-xs text-[var(--text-primary)]">Match Score: {score}/100</p>
                   {opportunity.ai_score_breakdown && (
                     <div className="space-y-1">
                       {opportunity.ai_score_breakdown.relevance != null && (
                         <div className="flex items-center justify-between gap-4 text-xs">
                           <span className="text-[var(--text-secondary)]">Relevance</span>
                           <span className="font-medium text-[var(--brand-primary)]">{Math.round(opportunity.ai_score_breakdown.relevance)}%</span>
                         </div>
                       )}
                       {opportunity.ai_score_breakdown.budget_fit != null && (
                         <div className="flex items-center justify-between gap-4 text-xs">
                           <span className="text-[var(--text-secondary)]">Budget Fit</span>
                           <span className="font-medium text-[var(--brand-primary)]">{Math.round(opportunity.ai_score_breakdown.budget_fit)}%</span>
                         </div>
                       )}
                       {opportunity.ai_score_breakdown.timing != null && (
                         <div className="flex items-center justify-between gap-4 text-xs">
                           <span className="text-[var(--text-secondary)]">Timing</span>
                           <span className="font-medium text-[var(--brand-primary)]">{Math.round(opportunity.ai_score_breakdown.timing)}%</span>
                         </div>
                       )}
                       {opportunity.ai_score_breakdown.reason && (
                         <p className="mt-1 text-xs text-[var(--text-muted)]">{opportunity.ai_score_breakdown.reason}</p>
                       )}
                     </div>
                   )}
                 </div>
               </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
        {opportunity.description}
      </p>

      {(opportunity.poster_name || opportunity.poster_company) && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {[opportunity.poster_name, opportunity.poster_company].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-[var(--text-primary)]">
          {formatBudget(opportunity.budget_min, opportunity.budget_max, opportunity.budget_type, opportunity.budget_currency)}
        </span>
        <span className="text-[var(--text-muted)]">·</span>
        <span className="text-xs text-[var(--text-muted)]">
          {opportunity.posted_at ? timeAgo(opportunity.posted_at) : ""}
        </span>
      </div>

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {skills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-[var(--surface-tertiary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]"
            >
              {skill}
            </span>
          ))}
          {remainingSkills > 0 && (
            <span className="text-[11px] text-[var(--text-muted)]">+{remainingSkills} more</span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-primary)] pt-3">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleStar}
          className={starred ? "text-[var(--status-warning)]" : "text-[var(--text-muted)]"}
          aria-label={starred ? "Unstar" : "Star"}
        >
          <Star className="h-4 w-4" fill={starred ? "currentColor" : "none"} />
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={handleGenerate}
          className="gap-1"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate Proposal
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          disabled={skipping}
          className="gap-1 text-[var(--text-muted)]"
        >
          <X className="h-3.5 w-3.5" />
          Skip
        </Button>

        <div className="flex-1" />

        <a
          href={opportunity.post_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="View original"
>
           <ExternalLink className="h-4 w-4" />
         </a>
       </div>
     </div>
   )
}

export const OpportunityCard = memo(OpportunityCardComponent)
