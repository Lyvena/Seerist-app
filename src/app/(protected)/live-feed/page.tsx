"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Radio, Pause, Play, Volume2, VolumeX, Star, FileText, X as XIcon,
  ExternalLink, Filter, Loader2, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScoreBadge } from "@/components/common/ScoreBadge"
import { EmptyState } from "@/components/common/EmptyState"
import { insforgeBrowser } from "@/lib/insforge/client"
import { toggleStar, skipOpportunity } from "@/app/actions/opportunities"
import { formatBudget } from "@/lib/opportunities"
import { timeAgo } from "@/lib/format"
import { toast } from "sonner"
import { ProposalModal } from "@/components/proposals/ProposalModal"

/* ─── Types ─── */
interface FeedItem {
  id: string
  external_id: string
  title: string
  description: string
  poster_name: string | null
  poster_company: string | null
  post_url: string
  budget_min: number | null
  budget_max: number | null
  budget_currency: string | null
  budget_type: string | null
  platform_id: string
  ai_score: number | null
  ai_score_breakdown: Record<string, number> | null
  required_skills: string[] | null
  status: string | null
  is_starred: boolean | null
  posted_at: string | null
  created_at: string
  platform_slug: string
  platform_name: string
  platform_logo_url: string | null
  isNew?: boolean
}

interface PlatformInfo {
  platform_id: string
  last_sync_at: string | null
  platform: { slug: string; name: string; logo_url: string | null }
}

interface TickerItem {
  id: string
  text: string
  ts: number
}

/* ─── Sound Engine ─── */
function playChime() {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.value = 0.08

    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = 880
    osc.connect(gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)

    const osc2 = ctx.createOscillator()
    osc2.type = "sine"
    osc2.frequency.value = 1320
    osc2.connect(gain)
    osc2.start(ctx.currentTime + 0.1)
    osc2.stop(ctx.currentTime + 0.25)
  } catch { /* silent */ }
}

/* ─── Constants ─── */
const MAX_FEED = 100
const POLL_INTERVAL = 5000
const TICKER_LIFETIME = 5000
const STATS_INTERVAL = 30000

const PLATFORM_COLORS: Record<string, string> = {
  upwork: "#14a800", freelancer: "#29b2fe", toptal: "#204ecf",
  fiverr: "#1dbf73", guru: "#2cae3b", remotok: "#edf2ff",
  weworkremotely: "#1f2224", linkedin: "#0a66c2", indeed: "#003a9b",
}

/* ─── Helpers ─── */
function timeAgoFn(dateStr: string | null): string {
  if (!dateStr) return "never"
  return timeAgo(dateStr)
}

/* ─── Page Component ─── */
export default function LiveFeedPage() {
  const router = useRouter()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([])
  const [todayCount, setTodayCount] = useState(0)
  const [proposalsToday, setProposalsToday] = useState(0)
  const [loading, setLoading] = useState(true)
  const [paused, setPaused] = useState(false)
  const [soundOn, setSoundOn] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("seerist-sound") !== "off"
  )
  const [activePlatformFilter, setActivePlatformFilter] = useState<string | null>(null)
  const [scoreFilter, setScoreFilter] = useState<number | null>(null)
  const [ticker, setTicker] = useState<TickerItem[]>([])
  const [userId, setUserId] = useState("")
  const [modalOpp, setModalOpp] = useState<{
    id: string; title: string; description: string; budget_min: number | null;
    budget_max: number | null; budget_currency: string | null; budget_type: string | null;
    required_skills: string[] | null; post_url: string; ai_score: number | null;
    ai_score_breakdown: Record<string, number> | null;
    platform_name: string; platform_logo_url: string | null;
    poster_name: string | null; poster_company: string | null; posted_at: string | null;
  } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const pausedRef = useRef(false)
  const soundRef = useRef(soundOn)
  const tickerCounter = useRef(0)

  /* get userId on mount */
  useEffect(() => {
    insforgeBrowser().auth.getCurrentUser().then(({ data }) => {
      if (data?.user?.id) setUserId(data.user.id)
    })
  }, [])

  const addTicker = useCallback((text: string) => {
    const id = `t-${++tickerCounter.current}`
    setTicker((prev) => [...prev.slice(-4), { id, text, ts: Date.now() }])
    setTimeout(() => setTicker((prev) => prev.filter((t) => t.id !== id)), TICKER_LIFETIME)
  }, [])

  const addToFeed = useCallback((items: FeedItem[]) => {
    setFeed((prev) => {
      const existing = new Set(prev.map((i) => i.id))
      const newItems = items.filter((i) => !existing.has(i.id)).map((i) => ({ ...i, isNew: true }))
      return [...newItems, ...prev].slice(0, MAX_FEED)
    })
    for (const item of items) {
      if (item.ai_score != null && item.ai_score >= 80) {
        if (soundRef.current) playChime()
        addTicker(`High-score match: ${item.title.slice(0, 50)}`)
      } else {
        addTicker(`New: ${item.title.slice(0, 50)}`)
      }
    }
  }, [addTicker])

  /* initial load + polling */
  useEffect(() => {
    async function fetchLatest(since?: string) {
      try {
        const params = since ? `?since=${encodeURIComponent(since)}` : ""
        const res = await fetch(`/api/live-feed/poll${params}`)
        if (!res.ok) return
        const data = await res.json()
        setPlatforms(data.platforms ?? [])
        setTodayCount(data.todayCount ?? 0)
        setProposalsToday(data.proposalsToday ?? 0)
        setLoading(false)
        if (data.opportunities?.length) addToFeed(data.opportunities)
      } catch { /* ignore */ }
    }

    fetchLatest()
    const interval = setInterval(() => {
      if (!pausedRef.current) fetchLatest(new Date(Date.now() - POLL_INTERVAL * 2).toISOString())
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [addToFeed])

  /* stats refresh */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/live-feed/poll")
        if (res.ok) {
          const data = await res.json()
          setTodayCount(data.todayCount ?? 0)
          setProposalsToday(data.proposalsToday ?? 0)
        }
      } catch { /* ignore */ }
    }, STATS_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  /* InsForge Realtime subscription */
  useEffect(() => {
    if (!userId) return
    let unsub = false
    async function subscribe() {
      try {
        const client = insforgeBrowser()
        await client.realtime.connect()
        const channel = `opportunities:${userId}`
        const res = await client.realtime.subscribe(channel)
        if (!res.ok || unsub) return
        client.realtime.on("new_opportunity", (msg: unknown) => {
          if (unsub) return
          const payload = (msg as { payload?: Record<string, unknown> })?.payload ?? msg
          if (payload && (payload as Record<string, unknown>).id) {
            addToFeed([payload as unknown as FeedItem])
          }
        })
      } catch { /* realtime fallback to polling */ }
    }
    subscribe()
    return () => { unsub = true; insforgeBrowser().realtime.disconnect() }
  }, [userId, addToFeed])

  /* clear "new" animation after 1s */
  useEffect(() => {
    if (!feed.length) return
    const t = setTimeout(() => setFeed((prev) => prev.map((i) => ({ ...i, isNew: false }))), 1000)
    return () => clearTimeout(t)
  }, [feed.length])

  /* pause/resume */
  function togglePause() {
    setPaused((p) => { pausedRef.current = !p; return !p })
  }

  function toggleSound() {
    setSoundOn((p) => {
      const next = !p
      soundRef.current = next
      localStorage.setItem("seerist-sound", next ? "on" : "off")
      if (next) playChime()
      return next
    })
  }

  /* quick actions */
  async function handleStar(id: string, starred: boolean | null) {
    await toggleStar(id, !!starred)
    setFeed((prev) => prev.map((i) => (i.id === id ? { ...i, is_starred: !i.is_starred } : i)))
    toast.success(starred ? "Unstarred" : "Starred")
  }

  async function handleSkip(id: string) {
    await skipOpportunity(id)
    setFeed((prev) => prev.filter((i) => i.id !== id))
    toast.success("Skipped")
  }

  function handleGenerateProposal(item: FeedItem) {
    setModalOpp({
      id: item.id, title: item.title, description: item.description,
      budget_min: item.budget_min, budget_max: item.budget_max,
      budget_currency: item.budget_currency, budget_type: item.budget_type,
      required_skills: item.required_skills, post_url: item.post_url,
      ai_score: item.ai_score, ai_score_breakdown: item.ai_score_breakdown,
      platform_name: item.platform_name, platform_logo_url: item.platform_logo_url,
      poster_name: item.poster_name, poster_company: item.poster_company,
      posted_at: item.posted_at,
    })
    setModalOpen(true)
  }

  /* derived */
  const hasPlatforms = platforms.length > 0
  const uniquePlatforms = [...new Set(feed.map((i) => i.platform_slug).filter(Boolean))]

  const filteredFeed = feed.filter((item) => {
    if (activePlatformFilter && item.platform_slug !== activePlatformFilter) return false
    if (scoreFilter !== null && (item.ai_score ?? 0) < scoreFilter) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
          <p className="text-sm text-[var(--text-muted)]">Connecting to live feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Live Feed</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              Monitoring {platforms.length} platform{platforms.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="group relative">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Last scan</span>
            </Button>
            <div className="absolute right-0 top-full mt-1 z-50 hidden w-56 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] p-3 shadow-lg group-hover:block">
              <p className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Last scan times</p>
              {platforms.length === 0 && <p className="text-xs text-[var(--text-muted)]">No platforms enabled</p>}
              {platforms.map((p) => (
                <div key={p.platform_id} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-[var(--text-secondary)]">{p.platform.name}</span>
                  <span className="text-[var(--text-muted)]">
                    {p.last_sync_at ? timeAgoFn(p.last_sync_at) : "never"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={togglePause} className="gap-1.5">
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span className="text-xs">{paused ? "Resume" : "Pause"}</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={toggleSound} className="gap-1.5">
            {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span className="text-xs">{soundOn ? "Sound On" : "Sound Off"}</span>
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] px-5 py-3">
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{todayCount}</p>
          <p className="text-xs text-[var(--text-muted)]">Discovered today</p>
        </div>
        <div className="h-8 w-px bg-[var(--border-primary)]" />
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{platforms.length}</p>
          <p className="text-xs text-[var(--text-muted)]">Active platforms</p>
        </div>
        <div className="h-8 w-px bg-[var(--border-primary)]" />
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{proposalsToday}</p>
          <p className="text-xs text-[var(--text-muted)]">Proposals today</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        <button
          onClick={() => setActivePlatformFilter(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            activePlatformFilter === null
              ? "bg-[var(--brand-primary)] text-white"
              : "bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]/80"
          }`}
        >
          All Platforms
        </button>
        {uniquePlatforms.map((slug) => (
          <button
            key={slug}
            onClick={() => setActivePlatformFilter(activePlatformFilter === slug ? null : slug)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              activePlatformFilter === slug
                ? "bg-[var(--brand-primary)] text-white"
                : "bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]/80"
            }`}
            style={activePlatformFilter !== slug && PLATFORM_COLORS[slug]
              ? { borderLeft: `3px solid ${PLATFORM_COLORS[slug]}` }
              : undefined}
          >
            {slug}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          {[null, 70, 80].map((score) => (
            <button
              key={score ?? "all"}
              onClick={() => setScoreFilter(score)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                scoreFilter === score
                  ? "bg-[var(--brand-primary)] text-white"
                  : "bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]/80"
              }`}
            >
              {score === null ? "All" : `${score}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Empty states */}
      {!hasPlatforms && (
        <EmptyState
          icon={Radio}
          title="Start monitoring to see your live feed"
          description="Enable platforms to begin discovering opportunities in real-time."
          action={<Button onClick={() => router.push("/platforms")}>Configure Platforms →</Button>}
        />
      )}

      {hasPlatforms && feed.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
            <span className="absolute h-12 w-12 animate-ping rounded-full bg-[var(--brand-primary)]/10" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Scanning platforms...</p>
          <p className="text-xs text-[var(--text-muted)]">First results appear in about 5 minutes</p>
        </div>
      )}

      {/* Feed timeline */}
      {hasPlatforms && feed.length > 0 && (
        <div className="space-y-2" id="live-feed-entries">
          {filteredFeed.length === 0 && (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">
              No items match the current filters.
            </div>
          )}
          {filteredFeed.map((item) => (
            <div
              key={item.id + item.created_at}
              className={`group relative rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-4 transition-all ${
                item.isNew ? "animate-slideDown border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/[0.02]" : ""
              }`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-0.5 -translate-x-1.5 bg-[var(--brand-primary)]/30 rounded-full opacity-50" />

              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-tertiary)]">
                  {item.platform_logo_url ? (
                    <Image src={item.platform_logo_url} alt="" width={20} height={20} className="h-5 w-5 object-contain" unoptimized />
                  ) : (
                    <div
                      className="h-5 w-5 rounded"
                      style={{ backgroundColor: PLATFORM_COLORS[item.platform_slug] ?? "#666" }}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {item.title}
                        </p>
                        {item.ai_score != null && (
                          <ScoreBadge score={item.ai_score} />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span className="capitalize">{item.platform_name || item.platform_slug}</span>
                        {item.posted_at && <><span>·</span><time>{timeAgoFn(item.posted_at)}</time></>}
                        {item.budget_min != null && (
                          <><span>·</span><span>{formatBudget(item.budget_min, item.budget_max, item.budget_type, item.budget_currency)}</span></>
                        )}
                        {item.poster_name && <><span>·</span><span>{item.poster_name}</span></>}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStar(item.id, item.is_starred ?? false)}
                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                          item.is_starred
                            ? "text-amber-400 hover:bg-amber-400/10"
                            : "text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--text-primary)]"
                        }`}
                        title={item.is_starred ? "Unstar" : "Star"}
                      >
                        <Star className={`h-3.5 w-3.5 ${item.is_starred ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={() => handleGenerateProposal(item)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--brand-primary)] transition-colors"
                        title="Generate Proposal"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleSkip(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)] hover:text-red-400 transition-colors"
                        title="Skip"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                      {item.post_url && (
                        <a
                          href={item.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                          title="View Original"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {item.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proposal Modal */}
      {modalOpp && (
        <ProposalModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          opportunity={modalOpp}
          productId=""
          userId={userId}
        />
      )}

      {/* Activity Ticker */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-1.5 pointer-events-none">
        {ticker.map((t) => (
          <div
            key={t.id}
            className="animate-tickerIn rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)] px-3 py-2 shadow-lg"
          >
            <p className="text-xs text-[var(--text-secondary)]">{t.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
