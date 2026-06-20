export function timeAgo(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = now - then
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatBudget(min: number | null, max: number | null, type: string | null, currency: string | null): string {
  const fmt = (n: number) => (currency === "USD" ? "$" : currency ?? "$") + n.toLocaleString()
  if (min && max) {
    if (type === "hourly") return `${fmt(min)}–${fmt(max)} / hr`
    if (type === "monthly") return `${fmt(min)}–${fmt(max)} / mo`
    return `${fmt(min)}–${fmt(max)}`
  }
  if (min) {
    if (type === "hourly") return `From ${fmt(min)} / hr`
    if (type === "monthly") return `From ${fmt(min)} / mo`
    return `From ${fmt(min)}`
  }
  if (max) {
    if (type === "hourly") return `Up to ${fmt(max)} / hr`
    if (type === "monthly") return `Up to ${fmt(max)} / mo`
    return `Up to ${fmt(max)}`
  }
  if (type === "hourly") return "Hourly"
  if (type === "fixed") return "Fixed price"
  return "Budget N/A"
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}
