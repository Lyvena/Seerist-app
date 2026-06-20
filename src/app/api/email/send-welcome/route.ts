import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/insforge"
import { welcome } from "@/lib/email-templates"

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
      .select("full_name")
      .eq("id", userId)
      .maybeSingle()

    const name = (profile as any)?.full_name ?? "there"

    const html = welcome({
      name,
      onboardingUrl: "https://seerist.xyz/onboarding",
    })

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
