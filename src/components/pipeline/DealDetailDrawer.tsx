"use client"

import { useState, useEffect, useRef } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, Clock, DollarSign, Target, Calendar, FileText, MessageSquare } from "lucide-react"
import { ScoreBadge } from "@/components/common/ScoreBadge"
import { Button } from "@/components/ui/button"
import { updateDealDetails } from "@/app/actions/pipeline"
import type { PipelineCardData } from "./PipelineKanban"

const STAGES = [
  { key: "discovered", label: "Discovered" },
  { key: "reviewed", label: "Reviewed" },
  { key: "proposal_drafted", label: "Proposal Drafted" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "in_negotiation", label: "In Negotiation" },
  { key: "closed_won", label: "Closed Won" },
  { key: "closed_lost", label: "Closed Lost" },
]

interface DealDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: PipelineCardData | null
  userId: string
}

export function DealDetailDrawer({ open, onOpenChange, card, userId }: DealDetailDrawerProps) {
  const [stage, setStage] = useState(card?.entry.stage ?? "")
  const [dealValue, setDealValue] = useState(card?.entry.deal_value?.toString() ?? "")
  const [closeDate, setCloseDate] = useState(card?.entry.expected_close_date ?? "")
  const [notes, setNotes] = useState(card?.entry.notes ?? "")
  const notesTimer = useRef<number | null>(null)

  useEffect(() => {
    if (card) {
      setStage(card.entry.stage)
      setDealValue(card.entry.deal_value?.toString() ?? "")
      setCloseDate(card.entry.expected_close_date ?? "")
      setNotes(card.entry.notes ?? "")
    }
  }, [card?.entry.id])

  function saveField(field: string, value: string | number | null) {
    if (!card) return
    updateDealDetails(card.entry.id, { [field]: value })
  }

  function handleNotesChange(val: string) {
    setNotes(val)
    if (notesTimer.current) window.clearTimeout(notesTimer.current)
    notesTimer.current = window.setTimeout(() => {
      saveField("notes", val)
    }, 1000)
  }

  if (!card) return null

  const opp = card.opportunity

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col bg-[var(--surface-primary)] shadow-drawer">
          <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
            <h2 className="truncate text-sm font-semibold text-[var(--text-primary)]">{opp.title}</h2>
            <Dialog.Close asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)]">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--surface-tertiary)] overflow-hidden">
                  {opp.platform_logo_url ? (
                    <img src={opp.platform_logo_url} alt="" className="h-4 w-4 object-contain" />
                  ) : (
                    <span className="text-[10px] font-semibold text-[var(--text-muted)]">{opp.platform_name.charAt(0)}</span>
                  )}
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{opp.platform_name}</span>
                <ScoreBadge score={opp.ai_score ?? 0} />
              </div>

              <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-4">{opp.description}</p>
            </div>

            <div className="mb-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Pipeline Stage</label>
                <select
                  value={stage}
                  onChange={(e) => { setStage(e.target.value); saveField("stage", e.target.value) }}
                  className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    <DollarSign className="mr-1 inline h-3 w-3" />
                    Deal Value
                  </label>
                  <input
                    type="number"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    onBlur={() => saveField("deal_value", dealValue ? parseFloat(dealValue) : null)}
                    className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    Expected Close
                  </label>
                  <input
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    onBlur={() => saveField("expected_close_date", closeDate || null)}
                    className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
                  <FileText className="mr-1 inline h-3 w-3" />
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="h-24 w-full resize-none rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  placeholder="Add notes about this deal..."
                />
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">Auto-saves on pause</p>
              </div>
            </div>

            <div>
              <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                <MessageSquare className="h-3.5 w-3.5" />
                Activity
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-tertiary)]">
                    <Clock className="h-3 w-3 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-primary)]">Added to pipeline</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{new Date(card.entry.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border-primary)] px-5 py-3">
            <a href={opp.post_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--brand-primary)] hover:underline">
              View Original Post
            </a>
            <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
