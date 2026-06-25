import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/insforge"
import { resolveUserEmail, safeEqual } from "@/lib/email"
import { newOpportunityAlert } from "@/lib/email-templates"

// Invoked by the monitor orchestrator when a high-relevance opportunity is found.
// Authenticated via a shared service secret (INSFORGE_API_KEY).
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key")
    const expected = process.env.INSFORGE_API_KEY
    if (!expected || !apiKey || !safeEqual(apiKey, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const { userId, opportunityId, score, platform, title, description, budget, keywords, email: callerEmail } = body ?? {}
    if (!userId || !title || score == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: user } = await admin.database
      .from("profiles")
      .select("id, full_name, plan")
      .eq("id", userId)
      .maybeSingle()
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { data: prefs } = await admin.database
      .from("alert_preferences")
      .select("digest_frequency, min_score_for_alert")
      .eq("user_id", userId)
      .maybeSingle()

    const digestFreq = (prefs as { digest_frequency?: string } | null)?.digest_frequency ?? "realtime"
    const minScore = (prefs as { min_score_for_alert?: number } | null)?.min_score_for_alert ?? 60

    if (score < minScore) {
      return NextResponse.json({ skipped: true, reason: "Below min score" })
    }

    // Non-realtime digests queue the alert for batch sending instead.
    if (digestFreq !== "realtime") {
      try {
        await admin.database.from("pending_alerts").insert([{
          user_id: userId,
          opportunity_external_id: opportunityId ?? "",
          score,
          platform_slug: platform ?? "unknown",
          title,
          created_at: new Date().toISOString(),
        }])
      } catch (e) {
        console.error("pending_alerts insert failed:", e)
      }
      return NextResponse.json({ queued: true })
    }

    const email = await resolveUserEmail(userId, callerEmail)
    if (!email) return NextResponse.json({ error: "No email on file" }, { status: 200 })

    const html = newOpportunityAlert({
      score,
      platform: platform ?? "platform",
      title,
      description: description ?? "",
      budget: budget ?? "N/A",
      keywords: keywords ?? [],
      opportunityUrl: `https://seerist.xyz/opportunities?id=${opportunityId ?? ""}`,
      proposalUrl: `https://seerist.xyz/proposals/generate?opportunity_id=${opportunityId ?? ""}`,
    })

    await admin.emails.send({
      to: email,
      subject: `${score}-score match on ${platform ?? "platform"}: ${title.slice(0, 60)}`,
      html,
      from: "Seerist",
      replyTo: "support@seerist.xyz",
    })

    // notifications.type is a free-text column (no CHECK), but keep it descriptive.
    await admin.database.from("notifications").insert([{
      user_id: userId,
      type: "opportunity",
      title: `New ${score}-score match on ${platform ?? "platform"}`,
      body: title.slice(0, 120),
      link: `/opportunities?id=${opportunityId ?? ""}`,
    }])

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error("send-alert error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
