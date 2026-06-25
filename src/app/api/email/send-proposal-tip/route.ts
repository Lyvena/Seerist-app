import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/insforge"
import { resolveUserEmail, safeEqual } from "@/lib/email"
import { proposalTip } from "@/lib/email-templates"

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key")
    const expected = process.env.INSFORGE_API_KEY
    if (!expected || !apiKey || !safeEqual(apiKey, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const { userId, email: callerEmail } = body ?? {}
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    const email = await resolveUserEmail(userId, callerEmail)
    if (!email) return NextResponse.json({ error: "No email on file" }, { status: 200 })

    const { data: profile } = await admin.database
      .from("profiles")
      .select("full_name, created_at")
      .eq("id", userId)
      .maybeSingle()

    const p = profile as { full_name: string | null; created_at: string | null } | null
    const name = p?.full_name ?? "there"
    const createdAt = p?.created_at ? new Date(p.created_at) : new Date()

    const daysSinceSignup = Math.floor((Date.now() - createdAt.getTime()) / 86_400_000)
    if (daysSinceSignup < 3) {
      return NextResponse.json({ skipped: true, reason: "Too early" })
    }

    const { count } = await admin.database
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)

    if ((count ?? 0) > 0) {
      return NextResponse.json({ skipped: true, reason: "Already has proposals" })
    }

    const html = proposalTip({ name, proposalUrl: "https://seerist.xyz/proposals" })

    await admin.emails.send({
      to: email,
      subject: "Tip: Let AI write your first proposal ✍️",
      html,
      from: "Seerist",
      replyTo: "support@seerist.xyz",
    })

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error("send-proposal-tip error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
