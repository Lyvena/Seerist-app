"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  BarChart3, DollarSign, Calendar,
  ArrowUpDown, Sparkles, ShieldAlert,
  Trophy, Star, Send, LineChart as LineChartIcon,
} from "lucide-react"
import {
  LineChart as RechartsLine, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts"
import { PageHeader } from "@/components/common/PageHeader"
import { StatCard } from "@/components/common/StatCard"
import { ScoreBadge } from "@/components/common/ScoreBadge"
import { Button } from "@/components/ui/button"
import { formatBudget } from "@/lib/opportunities"

const RANGE_OPTIONS = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
]

const CHART_COLORS = ["var(--brand-primary)", "var(--status-info)", "var(--status-success)", "var(--status-warning)", "var(--status-error)"]

const SCORE_COLORS = ["var(--score-critical)", "var(--score-low)", "var(--status-warning)", "var(--score-medium)", "var(--score-high)"]

type SortKey = "opps" | "avgScore" | "proposals" | "won" | "winRate" | "avgDeal"

interface Props {
  range: string
  isPro: boolean
  statCards: {
    opportunitiesDiscovered: { value: number; change: number }
    proposalsSent: { value: number; change: number }
    winRate: { value: number; change: number }
    pipelineValue: { value: number; change: number }
  }
  dailyData: { date: string; total: number; highScore: number }[]
  scoreDistData: { range: string; count: number }[]
  platformRows: {
    platformId: string; platformName: string; platformSlug: string; platformLogo: string | null
    opps: number; avgScore: number; proposals: number; won: number; winRate: number; avgDeal: number
  }[]
  topOpps: { id: string; title: string; platformName: string; platformLogo: string | null; score: number; status: string; budget: string; createdAt: string }[]
  proposalStats: { sent: number; responses: number; accepted: number; rejected: number; noResponse: number; avgRating: number }
  tonePerformance: { tone: string; avgRating: number; count: number }[]
  revenueMetrics: { wonRevenue: number; avgDealSize: number; bestPlatformName: string; wonDealCount: number }
}

export default function AnalyticsClient({
  range, isPro, statCards, dailyData, scoreDistData,
  platformRows, topOpps, proposalStats, tonePerformance, revenueMetrics,
}: Props) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>("opps")
  const [sortAsc, setSortAsc] = useState(false)
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  function setRange(r: string) {
    router.push(`/analytics?range=${r}`)
  }

  function applyCustom() {
    if (customStart && customEnd) {
      router.push(`/analytics?range=custom&start=${customStart}&end=${customEnd}`)
    }
  }

  const sortedPlatforms = [...platformRows].sort((a, b) => {
    const mul = sortAsc ? 1 : -1
    return (a[sortKey] - b[sortKey]) * mul
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const proposalPieData = [
    { name: "Accepted", value: proposalStats.accepted, color: "#22c55e" },
    { name: "Rejected", value: proposalStats.rejected, color: "#ef4444" },
    { name: "No Response", value: proposalStats.noResponse, color: "#6b7280" },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" subtitle="Track your opportunity pipeline performance">
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                range === opt.key
                  ? "bg-[var(--brand-primary)] text-white"
                  : "bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {range === "custom" ? (
            <div className="flex items-center gap-1">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="w-28 rounded-lg border border-[var(--brand-primary)] bg-[var(--surface-primary)] px-2 py-1 text-xs text-[var(--text-primary)]" />
              <span className="text-xs text-[var(--text-muted)]">–</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="w-28 rounded-lg border border-[var(--brand-primary)] bg-[var(--surface-primary)] px-2 py-1 text-xs text-[var(--text-primary)]" />
              <Button variant="ghost" size="xs" onClick={applyCustom}>Go</Button>
            </div>
          ) : (
            <button
              onClick={() => setRange("custom")}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <Calendar className="inline h-3.5 w-3.5 mr-1" />
              Custom
            </button>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Opportunities Discovered" value={statCards.opportunitiesDiscovered.value.toString()} icon={BarChart3}
          trend={{ value: `${statCards.opportunitiesDiscovered.change >= 0 ? "+" : ""}${statCards.opportunitiesDiscovered.change}%`, positive: statCards.opportunitiesDiscovered.change >= 0 }} />
        <StatCard label="Proposals Sent" value={statCards.proposalsSent.value.toString()} icon={Send}
          trend={{ value: `${statCards.proposalsSent.change >= 0 ? "+" : ""}${statCards.proposalsSent.change}%`, positive: statCards.proposalsSent.change >= 0 }} />
        <StatCard label="Win Rate" value={`${statCards.winRate.value}%`} icon={Trophy}
          trend={{ value: `${statCards.winRate.change >= 0 ? "+" : ""}${statCards.winRate.change}%`, positive: statCards.winRate.change >= 0 }} />
        <StatCard label="Pipeline Value" value={`$${(statCards.pipelineValue.value).toLocaleString()}`} icon={DollarSign}
          trend={{ value: `${statCards.pipelineValue.change >= 0 ? "+" : ""}${statCards.pipelineValue.change}%`, positive: statCards.pipelineValue.change >= 0 }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <LineChartIcon className="h-4 w-4" />
            Opportunities Over Time
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RechartsLine data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={{ background: "var(--surface-primary)", border: "1px solid var(--border-primary)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="total" stroke="var(--brand-primary)" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="highScore" stroke="var(--status-success)" strokeWidth={2} dot={false} name="High Score (≥70)" />
            </RechartsLine>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <BarChart3 className="h-4 w-4" />
            Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={scoreDistData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={{ background: "var(--surface-primary)", border: "1px solid var(--border-primary)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {scoreDistData.map((_, i) => (<Cell key={i} fill={SCORE_COLORS[i]} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <BarChart3 className="h-4 w-4" />
          Platform Performance
        </h3>
        {platformRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">No platform data yet</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)]">
                  {(["opps", "avgScore", "proposals", "won", "winRate", "avgDeal"] as SortKey[]).map((key) => (
                    <th key={key} onClick={() => toggleSort(key)}
                      className="cursor-pointer px-3 py-2 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-primary)]">
                      <ArrowUpDown className="inline h-3 w-3 mr-1" />
                      {key === "opps" ? "Opps Found" : key === "avgScore" ? "Avg Score" : key === "proposals" ? "Proposals" : key === "won" ? "Won" : key === "winRate" ? "Win Rate" : "Avg Deal $"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPlatforms.map((row) => (
                  <tr key={row.platformId} className="border-b border-[var(--border-primary)] hover:bg-[var(--surface-secondary)]">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[var(--surface-tertiary)] overflow-hidden">
                          {row.platformLogo ? <Image src={row.platformLogo} alt="" width={16} height={16} className="h-4 w-4 object-contain" unoptimized /> : <span className="text-[9px] font-semibold text-[var(--text-muted)]">{row.platformName.charAt(0)}</span>}
                        </div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{row.platformName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">{row.opps}</td>
                    <td className="px-3 py-2.5"><ScoreBadge score={row.avgScore} /></td>
                    <td className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">{row.proposals}</td>
                    <td className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">{row.won}</td>
                    <td className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">{row.winRate}%</td>
                    <td className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">${row.avgDeal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {topOpps.length > 0 && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Trophy className="h-4 w-4" />
            Top Opportunities (Last 30 Days)
          </h3>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)]">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Title</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Platform</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Score</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Budget</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {topOpps.map((opp) => (
                  <tr key={opp.id} className="border-b border-[var(--border-primary)] hover:bg-[var(--surface-secondary)]">
                    <td className="max-w-[200px] truncate px-3 py-2.5 text-sm font-medium text-[var(--text-primary)]">{opp.title}</td>
                    <td className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">{opp.platformName}</td>
                    <td className="px-3 py-2.5"><ScoreBadge score={opp.score} /></td>
                    <td className="px-3 py-2.5 text-sm capitalize text-[var(--text-secondary)]">{opp.status}</td>
                    <td className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">{opp.budget}</td>
                    <td className="px-3 py-2.5 text-sm text-[var(--text-muted)]">{opp.createdAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Send className="h-4 w-4" />
            Proposal Performance
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--text-secondary)]">Sent</span>
                <span className="font-medium text-[var(--text-primary)]">{proposalStats.sent}</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-tertiary)]">
                <div className="h-2 rounded-full bg-[var(--brand-primary)]" style={{ width: `${proposalStats.sent > 0 ? 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--text-secondary)]">Responses</span>
                <span className="font-medium text-[var(--text-primary)]">{proposalStats.responses}</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-tertiary)]">
                <div className="h-2 rounded-full bg-[var(--status-success)]" style={{ width: `${proposalStats.sent > 0 ? (proposalStats.responses / proposalStats.sent) * 100 : 0}%` }} />
              </div>
            </div>

            {proposalPieData.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={proposalPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {proposalPieData.map((_, i) => (
                      <Cell key={i} fill={proposalPieData[i].color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--surface-primary)", border: "1px solid var(--border-primary)", borderRadius: 8, fontSize: 12 }} />
                  <Legend formatter={(value: string) => <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-[var(--status-warning)] fill-current" />
              <span className="text-[var(--text-secondary)]">Avg Rating:</span>
              <span className="font-semibold text-[var(--text-primary)]">{proposalStats.avgRating.toFixed(1)} / 5</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Sparkles className="h-4 w-4" />
            Tone Performance
          </h3>
          {tonePerformance.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">No proposal data yet</p>
          ) : (
            <div className="space-y-3">
              {tonePerformance.map((t) => (
                <div key={t.tone}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-[var(--text-secondary)]">{t.tone}</span>
                    <span className="font-medium text-[var(--text-primary)]">{t.avgRating.toFixed(1)} ★ ({t.count})</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface-tertiary)]">
                    <div className="h-2 rounded-full bg-[var(--brand-primary)]" style={{ width: `${(t.avgRating / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <DollarSign className="h-4 w-4" />
          Revenue Metrics
        </h3>

        {!isPro && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-[var(--surface-primary)]/70 backdrop-blur-sm">
            <ShieldAlert className="h-8 w-8 text-[var(--text-muted)] mb-2" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Upgrade to Pro</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Revenue metrics are available on Pro and Agency plans</p>
            <Button variant="default" size="sm" className="mt-3">View Plans</Button>
          </div>
        )}

        <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${!isPro ? "blur-sm pointer-events-none select-none" : ""}`}>
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Total Won Revenue</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">${revenueMetrics.wonRevenue.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Deals Won</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{revenueMetrics.wonDealCount}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Avg Deal Size</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">${revenueMetrics.avgDealSize.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Best Platform</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{revenueMetrics.bestPlatformName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
