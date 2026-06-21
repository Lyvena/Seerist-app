"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import * as Dialog from "@radix-ui/react-dialog"
import {
  X,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Pencil,
  Send,
  Star,
  ChevronDown,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScoreBadge } from "@/components/common/ScoreBadge"
import { formatBudget, timeAgo } from "@/lib/opportunities"

type Tone = "professional" | "casual" | "enthusiastic" | "concise"

interface Proposal {
  id: string
  content: string
  version: number
  tone_used: string
  word_count: number | null
  model_used: string | null
  tokens_used: number | null
  sent_at: string | null
  rating: number | null
}

interface OpportunityData {
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

interface ProposalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: OpportunityData | null
  productId: string
  userId: string
}

export function ProposalModal({ open, onOpenChange, opportunity, productId, userId }: ProposalModalProps) {
  const [tone, setTone] = useState<Tone>("professional")
  const [customInstructions, setCustomInstructions] = useState("")
  const [generating, setGenerating] = useState(false)
  const [streamedContent, setStreamedContent] = useState("")
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [activeVersion, setActiveVersion] = useState(1)
  const [editMode, setEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [copied, setCopied] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !opportunity) {
      setStreamedContent("")
      setGenerating(false)
      setEditMode(false)
      setCopied(false)
      setRating(0)
      setCustomInstructions("")
      setActiveVersion(1)
      setProposals([])
      if (abortRef.current) abortRef.current.abort()
      return
    }

    loadExistingProposals()
  }, [open, opportunity?.id])

  async function loadExistingProposals() {
    if (!opportunity) return
    try {
      const { insforgeBrowser } = await import("@/lib/insforge/client")
      const { data } = await insforgeBrowser().database
        .from("proposals")
        .select("id, content, version, tone_used, word_count, model_used, tokens_used, sent_at, rating")
        .eq("opportunity_id", opportunity.id)
        .eq("user_id", userId)
        .order("version", { ascending: true })

      if (data && data.length > 0) {
        setProposals(data as Proposal[])
        setActiveVersion((data as Proposal[])[(data as Proposal[]).length - 1].version)
      }
    } catch (err) {
      console.error("Failed to load proposals:", err)
    }
  }

  const currentProposal = proposals.find((p) => p.version === activeVersion)
  const displayContent = streamedContent || currentProposal?.content || ""
  const wordCount = displayContent.split(/\s+/).filter(Boolean).length

  async function generate() {
    if (!opportunity) return

    if (abortRef.current) abortRef.current.abort()

    setGenerating(true)
    setStreamedContent("")
    setEditMode(false)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: opportunity.id,
          product_id: productId,
          tone,
          custom_instructions: customInstructions || undefined,
          regenerate: proposals.length > 0,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        console.error("Generation failed:", err)
        setGenerating(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setGenerating(false)
        return
      }

      const decoder = new TextDecoder()
      let fullText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.done) {
                const nextVersion = proposals.length + 1
                const newProposal: Proposal = {
                  id: data.proposal_id ?? crypto.randomUUID(),
                  content: fullText,
                  version: nextVersion,
                  tone_used: tone,
                  word_count: fullText.split(/\s+/).filter(Boolean).length,
                  model_used: data.model_used ?? null,
                  tokens_used: data.tokens_used ?? null,
                  sent_at: null,
                  rating: null,
                }
                setProposals((prev) => [...prev, newProposal])
                setActiveVersion(nextVersion)
                break
              }
              if (data.error) {
                console.error("Generation error:", data.error)
                break
              }
              if (data.content) {
                fullText += data.content
                setStreamedContent(fullText)
              }
} catch {}
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Generation failed:", err)
      }
    } finally {
      setGenerating(false)
      abortRef.current = null
    }
  }

  async function saveEditedProposal() {
    if (!currentProposal || !opportunity) return
    setSaving(true)

    try {
      const { insforgeBrowser } = await import("@/lib/insforge/client")
      await insforgeBrowser().database
        .from("proposals")
        .update({
          content: editedContent,
          word_count: editedContent.split(/\s+/).filter(Boolean).length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentProposal.id)

      setProposals((prev) =>
        prev.map((p) => (p.version === activeVersion ? { ...p, content: editedContent, word_count: editedContent.split(/\s+/).filter(Boolean).length } : p))
      )
    } catch (err) {
      console.error("Failed to save:", err)
    } finally {
      setSaving(false)
    }
  }

  async function toggleEdit() {
    if (editMode) {
      await saveEditedProposal()
      setEditMode(false)
    } else {
      setEditedContent(displayContent)
      setEditMode(true)
    }
  }

  async function handleMarkSent() {
    if (!opportunity || !currentProposal) return
    setSending(true)
    try {
      const { insforgeBrowser } = await import("@/lib/insforge/client")
      const now = new Date().toISOString()
      const client = insforgeBrowser()

      await client.database
        .from("proposals")
        .update({ sent_at: now, status: "sent" })
        .eq("id", currentProposal.id)

      await client.database
        .from("opportunities")
        .update({ status: "proposed", updated_at: now })
        .eq("id", opportunity.id)

      setProposals((prev) => prev.map((p) => (p.version === activeVersion ? { ...p, sent_at: now } : p)))
    } catch (err) {
      console.error("Failed to mark sent:", err)
    } finally {
      setSending(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(displayContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRate(value: number) {
    setRating(value)
    setProposals((prev) =>
      prev.map((p) => (p.version === activeVersion ? { ...p, rating: value } : p))
    )
  }

  const TONES: { key: Tone; label: string }[] = [
    { key: "professional", label: "Professional" },
    { key: "casual", label: "Casual" },
    { key: "enthusiastic", label: "Enthusiastic" },
    { key: "concise", label: "Concise" },
  ]

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto md:inset-4 md:rounded-2xl md:p-0">
          <div className="flex min-h-full w-full max-w-[720px] flex-col bg-[var(--surface-primary)] shadow-drawer md:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)] overflow-hidden">
                  {opportunity?.platform_logo_url ? (
                    <Image src={opportunity.platform_logo_url} alt="" width={24} height={24} className="h-6 w-6 object-contain" unoptimized />
                  ) : (
                    <span className="text-sm font-semibold text-[var(--text-secondary)]">{opportunity?.platform_name?.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-[var(--text-primary)]">{opportunity?.title ?? "Loading..."}</h2>
                  <p className="text-xs text-[var(--text-muted)]">{opportunity?.platform_name}</p>
                </div>
              </div>
              <Dialog.Close asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)]" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
              <aside className="w-full shrink-0 border-b border-[var(--border-primary)] p-5 md:w-[280px] md:border-b-0 md:border-r md:overflow-y-auto md:scrollbar-thin">
                <h3 className="mb-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Opportunity</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">{opportunity?.title}</h4>
                    {opportunity?.poster_name && (
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {[opportunity.poster_name, opportunity.poster_company].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-6">
                    {opportunity?.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)]">Budget</p>
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {opportunity ? formatBudget(opportunity.budget_min, opportunity.budget_max, opportunity.budget_type, opportunity.budget_currency) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[var(--text-muted)]">Posted</p>
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {opportunity?.posted_at ? timeAgo(opportunity.posted_at) : "—"}
                      </p>
                    </div>
                  </div>

                  {opportunity?.required_skills && opportunity.required_skills.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] text-[var(--text-muted)]">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {opportunity.required_skills.slice(0, 8).map((s) => (
                          <span key={s} className="rounded-md bg-[var(--surface-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-1.5 text-[11px] text-[var(--text-muted)]">AI Score</p>
                    {opportunity && <ScoreBadge score={opportunity.ai_score ?? 0} />}
                  </div>

                  {opportunity?.ai_score_breakdown && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-[var(--text-muted)]">Score Breakdown</p>
                      {Object.entries(opportunity.ai_score_breakdown).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-[11px]">
                          <span className="text-[var(--text-muted)] capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="font-medium text-[var(--text-primary)]">{Math.round(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-[var(--border-primary)] p-4">
                  <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-secondary)] p-0.5">
                    {TONES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTone(t.key)}
                        className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                          tone === t.key ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <div className="flex-1">
                      <input
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="Optional: add special instructions..."
                        className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                      />
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={generate}
                      disabled={generating}
                      className="gap-1"
                    >
                      {generating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {generating ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {!displayContent && !generating && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-light)]">
                        <Sparkles className="h-6 w-6 text-[var(--brand-primary)]" />
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">Generate a Proposal</h3>
                      <p className="mt-1 max-w-xs text-xs text-[var(--text-muted)]">
                        Select a tone, add optional instructions, and click Generate to create a tailored proposal.
                      </p>
                    </div>
                  )}

                  {displayContent && (
                    <div ref={contentRef} className="min-h-[200px]">
                      {editMode ? (
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="h-full min-h-[300px] w-full resize-none rounded-lg border border-[var(--brand-primary)] bg-[var(--surface-primary)] p-4 text-sm text-[var(--text-primary)] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-light)]"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-sm text-[var(--text-primary)] leading-relaxed">
                          {displayContent}
                          {generating && <span className="ml-0.5 animate-pulse text-[var(--brand-primary)]">▊</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {displayContent && (
                  <div className="shrink-0 border-t border-[var(--border-primary)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-[var(--surface-tertiary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                          {wordCount} words
                        </span>

                        {proposals.length > 1 && (
                          <div className="flex items-center gap-1">
                            <select
                              value={activeVersion}
                              onChange={(e) => {
                                setActiveVersion(Number(e.target.value))
                                setEditMode(false)
                              }}
                              className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-2 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none"
                            >
                              {proposals.map((p) => (
                                <option key={p.version} value={p.version}>
                                  v{p.version} ({p.tone_used})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={toggleEdit} aria-label="Edit" className="text-[var(--text-muted)]">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={handleCopy} aria-label="Copy" className="text-[var(--text-muted)]">
                          {copied ? <Check className="h-3.5 w-3.5 text-[var(--status-success)]" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleMarkSent}
                          disabled={sending || !!currentProposal?.sent_at}
                          className="gap-1 text-[11px] text-[var(--text-muted)]"
                        >
                          {currentProposal?.sent_at ? (
                            <>Sent ✓</>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              Mark Sent
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-[var(--border-primary)] pt-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-[var(--text-muted)]">Rate:</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRate(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-0.5"
                            aria-label={`Rate ${star} stars`}
                          >
                            <Star
                              className="h-3.5 w-3.5"
                              fill={star <= (hoverRating || rating) ? "var(--status-warning)" : "none"}
                              color={star <= (hoverRating || rating) ? "var(--status-warning)" : "var(--text-muted)"}
                            />
                          </button>
                        ))}
                      </div>

                      {currentProposal?.model_used && (
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Model: {currentProposal.model_used}
                          {currentProposal.tokens_used && ` · ~${currentProposal.tokens_used} tokens`}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
