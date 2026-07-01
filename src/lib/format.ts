/**
 * Shared formatting helpers used across the app (live feed, notifications,
 * proposals, opportunities, analytics). Centralized to avoid the per-page
 * duplications that existed before.
 */

/** Compact relative time, e.g. "just now", "12m ago", "3h ago", "Jan 5". */
export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 45) return "just now"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** Format a budget range, e.g. "$500 – $1,000", "$500+", "Budget n/a". */
export function formatBudget(
  min: number | null | undefined,
  max: number | null | undefined,
  currency = "USD"
): string {
  const cur = currency === "USD" ? "$" : ""
  if (min != null && max != null) {
    return `${cur}${formatNumber(min)} – ${cur}${formatNumber(max)}`
  }
  if (min != null) return `${cur}${formatNumber(min)}+`
  if (max != null) return `up to ${cur}${formatNumber(max)}`
  return "Budget n/a"
}

/** Compact number formatting: 1200 -> "1.2k", 1500000 -> "$1.5M". */
export function formatCompactCurrency(value: number | null | undefined, currency = "USD"): string {
  if (value == null) return "—"
  const symbol = currency === "USD" ? "$" : ""
  if (Math.abs(value) >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${symbol}${(value / 1_000).toFixed(1)}k`
  return `${symbol}${value}`
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-US").format(value)
}

export function formatDate(
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", opts)
}

/** Initials from an email or name, e.g. "john@example.com" -> "JO". */
export function getInitials(input: string | undefined | null): string {
  if (!input) return "U"
  const base = input.split("@")[0]
  return base.slice(0, 2).toUpperCase()
}
