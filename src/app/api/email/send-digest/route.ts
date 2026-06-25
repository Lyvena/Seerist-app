import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/insforge"
import { resolveUserEmail, safeEqual } from "@/lib/email"
import { dailyDigest, weeklyDigest } from "@/lib/email-templates"

// Invoked by the daily/weekly cron schedule. Authenticated via INSFORGE_API_KEY.
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key")
    const expected = process.env.INSFORGE_API_KEY
    if (!expected || !apiKey || !safeEqual(apiKey, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const isWeekly = body?.mode === "weekly"

    const { data: alertUsers } = await admin.database
      .from("pending_alerts")
      .select("user_id")
      .limit(1000)

    const userIds = [...new Set(((alertUsers ?? []) as Array<{ user_id: string }>).map((a) => a.user_id))]
    if (userIds.length === 0) {
      return NextResponse.json({ sent: 0, totalUsers: 0 })
    }

    const { data: allProfiles } = await admin.database
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds)

    const profiles = (allProfiles ?? []) as Array<{ id: string; full_name: string | null }>
    let sent = 0

    for (const profile of profiles) {
      const email = await resolveUserEmail(profile.id)
      const name = profile.full_name ?? "there"
      if (!email) continue

      const { data: alerts } = await admin.database
        .from("pending_alerts")
        .select("id, score, platform_slug, title, opportunity_external_id")
        .eq("user_id", profile.id)

      const alertList = (alerts ?? []) as Array<{
        id: string
        score: number
        platform_slug: string
        title: string
        opportunity_external_id: string
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
        if (count < minCount) {
          minCount = count
          worstPlatform = slug
        }
      })

      const topOpps = [...alertList]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((a) => ({
          title: a.title,
          platform: a.platform_slug,
          score: a.score,
          url: `https://seerist.xyz/opportunities?id=${a.opportunity_external_id}`,
        }))

      if (isWeekly) {
        const html = weeklyDigest({
          name,
          discovered: totalOpps,
          prevDiscovered: 0,
          highScore,
          proposalsSent: 0,
          winRate: 0,
          platformsScanned: platformCounts.size,
          topOpps,
          totalOpps,
          digestUrl: "https://seerist.xyz/opportunities",
        })

        await admin.emails.send({
          to: email,
          subject: `Your Seerist Weekly Digest — ${totalOpps} new opportunities`,
          html,
          from: "Seerist",
          replyTo: "support@seerist.xyz",
        })
      } else {
        const html = dailyDigest({
          name,
          discovered: totalOpps,
          highScore,
          platformsScanned: platformCounts.size,
          topOpps,
          totalOpps,
          worstPlatform,
          digestUrl: "https://seerist.xyz/opportunities",
        })

        await admin.emails.send({
          to: email,
          subject: `Your Seerist Daily Digest — ${totalOpps} new opportunities`,
          html,
          from: "Seerist",
          replyTo: "support@seerist.xyz",
        })
      }

      // Delete only the alerts we just consumed (by id), not the whole user set,
      // so alerts arriving during processing aren't lost.
      await admin.database
        .from("pending_alerts")
        .delete()
        .in("id", alertList.map((a) => a.id))

      sent++
    }

    return NextResponse.json({ sent, totalUsers: profiles.length })
  } catch (err) {
    console.error("send-digest error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
