"use client"

import React, { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink, Send, Star, FileText, Eye, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { timeAgo, formatBudget } from "@/lib/format"
import { markProposalSent } from "@/app/actions/proposals"
import { toast } from "sonner"

interface ProposalRow {
  id: string
  content: string
  version: number
  tone_used: string
  word_count: number | null
  model_used: string | null
  is_ai_generated: boolean
  sent_at: string | null
  rating: number | null
  created_at: string
  opportunity_id: string
  opportunity: {
    title: string
    platform_name: string
    platform_logo_url: string | null
    budget_min: number | null
    budget_max: number | null
    budget_currency: string | null
    budget_type: string | null
  } | null
}

interface ProposalsPageClientProps {
  proposals: ProposalRow[]
}

export function ProposalsPageClient({ proposals }: ProposalsPageClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)

  async function handleMarkSent(proposalId: string) {
    setMarkingId(proposalId)
    try {
      const { error } = await markProposalSent(proposalId)
      if (error) throw new Error(error)
      toast.success("Proposal marked as sent")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update proposal")
    } finally {
      setMarkingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals"
        subtitle="View and manage all your generated proposals"
      />

      {proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          description="Generate your first proposal from an opportunity to see it here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)]">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Opportunity</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Version</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Tone</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Words</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Rating</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <React.Fragment key={proposal.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === proposal.id ? null : proposal.id)}
                      className="border-b border-[var(--border-secondary)] transition-colors hover:bg-[var(--surface-secondary)] cursor-pointer last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-tertiary)] overflow-hidden">
                            {proposal.opportunity?.platform_logo_url ? (
                              <Image src={proposal.opportunity.platform_logo_url} alt="" width={16} height={16} className="h-4 w-4 object-contain" unoptimized />
                            ) : (
                              <span className="text-[10px] font-semibold text-[var(--text-muted)]">{proposal.opportunity?.platform_name?.charAt(0) ?? "?"}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{proposal.opportunity?.title ?? "Unknown"}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">{proposal.opportunity?.platform_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-[var(--surface-tertiary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">v{proposal.version}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm capitalize text-[var(--text-secondary)]">{proposal.tone_used.replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--text-secondary)]">{proposal.word_count ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {proposal.sent_at ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-success-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-success)]">
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-tertiary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {proposal.rating ? (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: proposal.rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-[var(--status-warning)] text-[var(--status-warning)]" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--text-muted)]">{timeAgo(proposal.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon-xs" className="text-[var(--text-muted)]" aria-label="View proposal">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                    {expandedId === proposal.id && (
                      <tr>
                        <td colSpan={8} className="border-b border-[var(--border-primary)] bg-[var(--surface-secondary)] px-4 py-4">
                          <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[var(--surface-primary)] p-4 text-sm text-[var(--text-primary)] leading-relaxed scrollbar-thin">
                            {proposal.content}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {proposal.model_used && (
                                <span className="text-[11px] text-[var(--text-muted)]">Model: {proposal.model_used}</span>
                              )}
                              {proposal.opportunity && (
                                <span className="text-[11px] text-[var(--text-muted)]">
                                  Budget: {formatBudget(proposal.opportunity.budget_min, proposal.opportunity.budget_max, proposal.opportunity.budget_currency ?? "USD" )}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {!proposal.sent_at && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => handleMarkSent(proposal.id)}
                                  loading={markingId === proposal.id}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Mark Sent
                                </Button>
                              )}
                              <Link href={`/opportunities?product=${proposal.opportunity_id}`}>
                                <Button variant="ghost" size="sm" className="gap-1.5">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  View Opportunity
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
