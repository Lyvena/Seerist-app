"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus, BarChart3, DollarSign, TrendingUp, Clock } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { PipelineColumn } from "./PipelineColumn"
import { PipelineCard } from "./PipelineCard"
import { DealDetailDrawer } from "./DealDetailDrawer"
import { AddDealModal } from "./AddDealModal"
import { movePipelineStage } from "@/app/actions/pipeline"

export interface PipelineEntry {
  id: string
  opportunity_id: string
  stage: string
  stage_changed_at: string | null
  deal_value: number | null
  deal_currency: string | null
  close_probability: number | null
  expected_close_date: string | null
  notes: string | null
  created_at: string
}

export interface OpportunityBrief {
  id: string
  title: string
  platform_name: string
  platform_logo_url: string | null
  ai_score: number | null
  budget_min: number | null
  budget_max: number | null
  budget_currency: string | null
  budget_type: string | null
  status: string | null
  description: string
  poster_name: string | null
  poster_company: string | null
  post_url: string
  required_skills: string[] | null
  posted_at: string | null
}

export interface PipelineCardData {
  entry: PipelineEntry
  opportunity: OpportunityBrief
}

const STAGES = [
  { key: "discovered", label: "Discovered", color: "bg-[var(--status-info)]" },
  { key: "reviewed", label: "Reviewed", color: "bg-[var(--status-warning)]" },
  { key: "proposal_drafted", label: "Proposal Drafted", color: "bg-[var(--brand-primary)]" },
  { key: "proposal_sent", label: "Proposal Sent", color: "bg-blue-500" },
  { key: "in_negotiation", label: "In Negotiation", color: "bg-purple-500" },
  { key: "closed_won", label: "Closed Won", color: "bg-[var(--status-success)]" },
  { key: "closed_lost", label: "Closed Lost", color: "bg-[var(--status-error)]" },
]

function daysInStage(changedAt: string | null): number {
  if (!changedAt) return 0
  const diff = Date.now() - new Date(changedAt).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function formatCurrency(value: number | null, currency: string | null): string {
  if (!value) return ""
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$"
  return `${sym}${value.toLocaleString()}`
}

interface PipelineKanbanProps {
  entries: PipelineCardData[]
  userId: string
}

export function PipelineKanban({ entries, userId }: PipelineKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<PipelineCardData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [closedTab, setClosedTab] = useState<"won" | "lost">("won")

  const activeCard = activeId ? entries.find((e) => e.entry.id === activeId) : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const entryId = active.id as string
    const card = entries.find((e) => e.entry.id === entryId)
    if (!card) return

    const targetStage = over.id as string
    if (card.entry.stage === targetStage) return

    await movePipelineStage(card.opportunity.id, targetStage, userId, card.entry.stage)
  }

  const grouped = STAGES.map((stage) => {
    const items = entries.filter((e) => {
      if (stage.key === "closed_won") return e.entry.stage === "closed_won"
      if (stage.key === "closed_lost") return e.entry.stage === "closed_lost"
      return e.entry.stage === stage.key
    })
    return { ...stage, items }
  })

  const activeEntries = grouped.filter((g) => g.key !== "closed_won" && g.key !== "closed_lost")
  const wonEntries = grouped.find((g) => g.key === "closed_won")
  const lostEntries = grouped.find((g) => g.key === "closed_lost")

  const totalPipelineValue = activeEntries.reduce((sum, col) => {
    return sum + col.items.reduce((s, item) => s + (item.entry.deal_value ?? 0), 0)
  }, 0)

  const wonCount = wonEntries?.items.length ?? 0
  const lostCount = lostEntries?.items.length ?? 0
  const totalClosed = wonCount + lostCount
  const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0

  const avgDealSize = wonCount > 0
    ? Math.round((wonEntries?.items.reduce((s, i) => s + (i.entry.deal_value ?? 0), 0) ?? 0) / wonCount)
    : 0

  const allDealValues = activeEntries.flatMap((col) => col.items.map((i) => i.entry.deal_value ?? 0))
  const avgDealSizeActive = allDealValues.length > 0
    ? Math.round(allDealValues.reduce((a, b) => a + b, 0) / allDealValues.length)
    : 0

  return (
    <>
      <PageHeader title="My Pipeline" subtitle="Track deals from discovery to close">
        <Button variant="default" size="sm" className="gap-1.5" onClick={() => setAddModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Deal Manually
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <DollarSign className="h-4 w-4" />
            Pipeline Value
          </div>
          <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{formatCurrency(totalPipelineValue, "USD")}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <TrendingUp className="h-4 w-4" />
            Win Rate
          </div>
          <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{winRate}%</p>
        </div>
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <BarChart3 className="h-4 w-4" />
            Avg Deal Size
          </div>
          <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{formatCurrency(avgDealSizeActive, "USD")}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Clock className="h-4 w-4" />
            Avg Time to Close
          </div>
          <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">—</p>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {activeEntries.map((stage) => (
            <SortableContext key={stage.key} items={stage.items.map((c) => c.entry.id)} strategy={verticalListSortingStrategy}>
              <PipelineColumn
                stage={stage.key}
                label={stage.label}
                dotColor={stage.color}
                count={stage.items.length}
                totalValue={stage.items.reduce((s, c) => s + (c.entry.deal_value ?? 0), 0)}
              >
                {stage.items.map((card) => (
                  <PipelineCard
                    key={card.entry.id}
                    card={card}
                    daysInStage={daysInStage(card.entry.stage_changed_at)}
                    onClick={() => { setSelectedEntry(card); setDrawerOpen(true) }}
                  />
                ))}
              </PipelineColumn>
            </SortableContext>
          ))}

          <div className="w-72 shrink-0">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 items-center gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] p-0.5">
                <button onClick={() => setClosedTab("won")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${closedTab === "won" ? "bg-[var(--status-success-light)] text-[var(--status-success)]" : "text-[var(--text-muted)]"}`}>Won ({wonEntries?.items.length ?? 0})</button>
                <button onClick={() => setClosedTab("lost")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${closedTab === "lost" ? "bg-[var(--status-error-light)] text-[var(--status-error)]" : "text-[var(--text-muted)]"}`}>Lost ({lostEntries?.items.length ?? 0})</button>
              </div>
            </div>
            <div className="space-y-2">
              {(closedTab === "won" ? wonEntries?.items : lostEntries?.items)?.map((card) => (
                <PipelineCard
                  key={card.entry.id}
                  card={card}
                  daysInStage={daysInStage(card.entry.stage_changed_at)}
                  onClick={() => { setSelectedEntry(card); setDrawerOpen(true) }}
                />
              ))}
              {(
                (closedTab === "won" ? wonEntries?.items : lostEntries?.items)?.length === 0
              ) && (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">No {closedTab} deals yet</p>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-64 opacity-90">
              <PipelineCard card={activeCard} daysInStage={daysInStage(activeCard.entry.stage_changed_at)} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DealDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        card={selectedEntry}
        userId={userId}
      />

      <AddDealModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        userId={userId}
      />
    </>
  )
}
