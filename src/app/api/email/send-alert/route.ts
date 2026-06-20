import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/insforge"
import { newOpportunityAlert } from "@/lib/email-templates"

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key")
    if (apiKey !== process.env.INSFORGE_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, opportunityId, score, platform, title, description, budget, keywords } = body

    const { data: user } = await admin.database
      .from("profiles")
      .select("id, full_name, plan")
      .eq("id", userId)
      .single()
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const authRes = await fetch(`${process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"}/api/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.INSFORGE_API_KEY}` },
    })
    const authData = await authRes.json().catch(() => ({}))
    const email = (authData as any)?.email ?? (authData as any)?.user?.email
    if (!email) return NextResponse.json({ error: "No email" }, { status: 200 })

    const { data: prefs } = await admin.database
      .from("alert_preferences")
      .select("digest_frequency, min_score_for_alert")
      .eq("user_id", userId)
      .maybeSingle()

    const digestFreq = (prefs as any)?.digest_frequency ?? "realtime"
    const minScore = (prefs as any)?.min_score_for_alert ?? 60

    if (score < minScore) {
      return NextResponse.json({ skipped: true, reason: "Below min score" })
    }

    if (digestFreq !== "realtime") {
      try {
        await admin.database.from("pending_alerts").insert([{
          user_id: userId,
          opportunity_external_id: opportunityId,
          score,
          platform_slug: platform,
          title,
          created_at: new Date().toISOString(),
        }])
      } catch {}
      return NextResponse.json({ queued: true })
    }

    const html = newOpportunityAlert({
      score,
      platform,
      title,
      description: description ?? "",
      budget: budget ?? "N/A",
      keywords: keywords ?? [],
      opportunityUrl: `https://seerist.xyz/opportunities?id=${opportunityId}`,
      proposalUrl: `https://seerist.xyz/proposals/generate?opportunity_id=${opportunityId}`,
    })

    await admin.emails.send({
      to: email,
      subject: `${score}-score match on ${platform}: ${title.slice(0, 60)}`,
      html,
      from: "Seerist",
      replyTo: "support@seerist.xyz",
    })

    await admin.database.from("notifications").insert([{
      user_id: userId,
      type: "new_opportunity",
      title: `New ${score}-score match on ${platform}`,
      body: title.slice(0, 120),
      link: `/opportunities?id=${opportunityId}`,
    }])

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error("send-alert error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
