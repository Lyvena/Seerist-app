"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import Image from "next/image"
import { GripVertical } from "lucide-react"
import { ScoreBadge } from "@/components/common/ScoreBadge"
import { formatBudget } from "@/lib/opportunities"
import type { PipelineCardData } from "./PipelineKanban"

interface PipelineCardProps {
  card: PipelineCardData
  daysInStage: number
  onClick: () => void
}

export function PipelineCard({ card, daysInStage, onClick }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.entry.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] p-3 transition-shadow hover:shadow-card"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Drag"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--surface-tertiary)] overflow-hidden">
              {card.opportunity.platform_logo_url ? (
                <Image src={card.opportunity.platform_logo_url} alt="" width={14} height={14} className="h-3.5 w-3.5 object-contain" unoptimized />
              ) : (
                <span className="text-[9px] font-semibold text-[var(--text-muted)]">{card.opportunity.platform_name.charAt(0)}</span>
              )}
            </div>
            <h4 className="truncate text-sm font-medium text-[var(--text-primary)]">{card.opportunity.title}</h4>
            <ScoreBadge score={card.opportunity.ai_score ?? 0} />
          </div>

          <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            {card.opportunity.budget_min != null && (
              <span>{formatBudget(card.opportunity.budget_min, card.opportunity.budget_max, card.opportunity.budget_type, card.opportunity.budget_currency)}</span>
            )}
            <span>{daysInStage}d in stage</span>
          </div>
        </div>
      </div>
    </div>
  )
}
