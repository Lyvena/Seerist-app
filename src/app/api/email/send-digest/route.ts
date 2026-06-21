import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@insforge/sdk"
import { dailyDigest, weeklyDigest } from "@/lib/email-templates"

const admin = createAdminClient({
  baseUrl: process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app",
  apiKey: process.env.INSFORGE_API_KEY ?? "ik_bcb691209aa697be33ceb6c9bce0f5e6",
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode } = body as { mode: "daily" | "weekly" }
    const isWeekly = mode === "weekly"

    const { data: alertUsers } = await admin.database
      .from("pending_alerts")
      .select("user_id")
      .limit(1000)

    const userIds = [...new Set(((alertUsers ?? []) as Array<{ user_id: string }>).map((a) => a.user_id))]

    const { data: allProfiles } = await admin.database
      .from("profiles")
      .select("id, full_name, plan")
      .in("id", userIds.length > 0 ? userIds : ["none"])

    const profiles = (allProfiles ?? []) as Array<{ id: string; full_name: string | null; plan: string | null }>
    let sent = 0

    for (const profile of profiles) {
      const authRes = await fetch(`${process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"}/api/admin/users/${profile.id}`, {
        headers: { Authorization: `Bearer ${process.env.INSFORGE_API_KEY}` },
      })
      const authData = await authRes.json().catch(() => ({}))
      const email = (authData as any)?.email ?? (authData as any)?.user?.email
      const name = profile.full_name ?? "there"
      if (!email) continue

      const { data: alerts } = await admin.database
        .from("pending_alerts")
        .select("*")
        .eq("user_id", profile.id)

      const alertList = (alerts ?? []) as Array<{
        score: number; platform_slug: string; title: string; opportunity_external_id: string
      }>

      if (alertList.length === 0) continue

      const totalOpps = alertList.length
      const highScore = alertList.filter((a) => a.score >= 70).length

      const platformCounts = new Map<string, number>()
      alertList.forEach((a) => {
        platformCounts.set(a.platform_slug, (platformCounts.get(a.platform_slug) ?? 0) + 1)
      })

      let worstPlatform: string | null = null
      let minCount = Infinity
      platformCounts.forEach((count, slug) => {
        if (count < minCount) { minCount = count; worstPlatform = slug }
      })

      const topOpps = alertList
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((a) => ({
          title: a.title,
          platform: a.platform_slug,
          score: a.score,
          url: `https://seerist.xyz/opportunities?id=${a.opportunity_external_id}`,
        }))

      if (isWeekly) {
        const prevWeekStart = new Date()
        prevWeekStart.setDate(prevWeekStart.getDate() - 14)
        const { count: prevCount } = await admin.database
          .from("pending_alerts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .gte("created_at", prevWeekStart.toISOString()) as any

        const html = weeklyDigest({
          name, discovered: totalOpps, prevDiscovered: prevCount ?? 0,
          highScore, proposalsSent: 0, winRate: 0, platformsScanned: platformCounts.size,
          topOpps, totalOpps, digestUrl: `https://seerist.xyz/opportunities`,
        })

        await admin.emails.send({
          to: email, subject: `Your Seerist Weekly Digest — ${totalOpps} new opportunities`,
          html, from: "Seerist", replyTo: "support@seerist.xyz",
        })
      } else {
        const html = dailyDigest({
          name, discovered: totalOpps, highScore,
          platformsScanned: platformCounts.size,
          topOpps, totalOpps, worstPlatform,
          digestUrl: `https://seerist.xyz/opportunities`,
        })

        await admin.emails.send({
          to: email, subject: `Your Seerist Daily Digest — ${totalOpps} new opportunities`,
          html, from: "Seerist", replyTo: "support@seerist.xyz",
        })
      }

      await admin.database
        .from("pending_alerts")
        .delete()
        .eq("user_id", profile.id)

      sent++
    }

    return NextResponse.json({ sent, totalUsers: profiles.length })
  } catch (err) {
    console.error("send-digest error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
