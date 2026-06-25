import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/insforge"
import { resolveUserEmail, safeEqual } from "@/lib/email"
import { welcome } from "@/lib/email-templates"

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
      .select("full_name")
      .eq("id", userId)
      .maybeSingle()

    const name = (profile as { full_name: string | null } | null)?.full_name ?? "there"

    const html = welcome({ name, onboardingUrl: "https://seerist.xyz/onboarding" })

    await admin.emails.send({
      to: email,
      subject: "Welcome to Seerist! Let's get started 🎉",
      html,
      from: "Seerist",
      replyTo: "support@seerist.xyz",
    })

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error("send-welcome error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
