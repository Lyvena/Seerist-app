"use client"

import { useState } from "react"
import { ExternalLink, Send, Star, FileText, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/PageHeader"

interface ProposalRow {
  id: string
  content: string
  version: number
  tone: string
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

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatBudget(min: number | null, max: number | null, type: string | null, currency: string | null) {
  const curr = currency ?? "$"
  if (min && max) return `${curr}${min} - ${curr}${max}${type ? `/${type}` : ""}`
  if (min) return `${curr}${min}+${type ? `/${type}` : ""}`
  if (max) return `Up to ${curr}${max}${type ? `/${type}` : ""}`
  return "Not specified"
}

export function ProposalsPageClient({ proposals }: ProposalsPageClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals"
        subtitle="View and manage all your generated proposals"
      />

      {proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-tertiary)]">
            <FileText className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">No proposals yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
            Generate your first proposal from an opportunity to see it here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-primary)]">
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
                <>
                  <tr
                    key={proposal.id}
                    onClick={() => setExpandedId(expandedId === proposal.id ? null : proposal.id)}
                    className="border-b border-[var(--border-primary)] bg-[var(--surface-primary)] transition-colors hover:bg-[var(--surface-secondary)] cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-tertiary)] overflow-hidden">
                          {proposal.opportunity?.platform_logo_url ? (
                            <img src={proposal.opportunity.platform_logo_url} alt="" className="h-4 w-4 object-contain" />
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
                      <span className="text-sm capitalize text-[var(--text-secondary)]">{proposal.tone}</span>
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
                    <tr key={`${proposal.id}-expanded`}>
                      <td colSpan={8} className="border-b border-[var(--border-primary)] bg-[var(--surface-secondary)] px-4 py-4">
                        <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[var(--surface-primary)] p-4 text-sm text-[var(--text-primary)] leading-relaxed scrollbar-thin">
                          {proposal.content}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {proposal.model_used && (
                              <span className="text-[11px] text-[var(--text-muted)]">Model: {proposal.model_used}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!proposal.sent_at && (
                              <Button variant="outline" size="xs" className="gap-1">
                                <Send className="h-3 w-3" />
                                Mark Sent
                              </Button>
                            )}
                            <Button variant="ghost" size="xs" className="gap-1">
                              <ExternalLink className="h-3 w-3" />
                              View Opportunity
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
