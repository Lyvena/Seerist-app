import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/insforge"
import { proposalTip } from "@/lib/email-templates"

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key")
    if (apiKey !== process.env.INSFORGE_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await request.json()

    const authRes = await fetch(`${process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"}/api/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.INSFORGE_API_KEY}` },
    })
    const authData = await authRes.json().catch(() => ({}))
    const email = (authData as any)?.email ?? (authData as any)?.user?.email
    if (!email) return NextResponse.json({ error: "No email" }, { status: 200 })

    const { data: profile } = await admin.database
      .from("profiles")
      .select("full_name, plan, created_at")
      .eq("id", userId)
      .maybeSingle()

    const p = profile as any
    const name = p?.full_name ?? "there"
    const createdAt = p?.created_at ? new Date(p.created_at) : new Date()

    const daysSinceSignup = Math.floor((Date.now() - createdAt.getTime()) / 86400000)
    if (daysSinceSignup < 3) {
      return NextResponse.json({ skipped: true, reason: "Too early" })
    }

    const { count: proposalCount } = await admin.database
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId) as any

    if ((proposalCount ?? 0) > 0) {
      return NextResponse.json({ skipped: true, reason: "Already has proposals" })
    }

    const html = proposalTip({
      name,
      proposalUrl: "https://seerist.xyz/proposals",
    })

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
