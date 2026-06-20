"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addManualDeal } from "@/app/actions/pipeline"
import { toast } from "sonner"

interface AddDealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

const STAGES = [
  { key: "discovered", label: "Discovered" },
  { key: "reviewed", label: "Reviewed" },
  { key: "proposal_drafted", label: "Proposal Drafted" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "in_negotiation", label: "In Negotiation" },
]

export function AddDealModal({ open, onOpenChange, userId }: AddDealModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [budgetMin, setBudgetMin] = useState("")
  const [budgetMax, setBudgetMax] = useState("")
  const [stage, setStage] = useState("discovered")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    const { error } = await addManualDeal(userId, null, {
      title: title.trim(),
      description: description.trim(),
      budget_min: budgetMin ? parseFloat(budgetMin) : null,
      budget_max: budgetMax ? parseFloat(budgetMax) : null,
    }, stage)

    setSaving(false)
    if (error) {
      toast.error("Failed to add deal")
      return
    }
    toast.success("Deal added to pipeline")
    onOpenChange(false)
    setTitle("")
    setDescription("")
    setBudgetMin("")
    setBudgetMax("")
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-0 shadow-drawer">
          <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Add Deal Manually</h2>
            <Dialog.Close asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)]">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                placeholder="e.g. Build a SaaS dashboard"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-20 w-full resize-none rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                placeholder="Brief description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Budget Min</label>
                <input
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Budget Max</label>
                <input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Pipeline Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            <Button type="submit" className="w-full gap-1.5" disabled={saving || !title.trim()}>
              <Plus className="h-4 w-4" />
              {saving ? "Adding..." : "Add to Pipeline"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
