import { NextRequest, NextResponse } from "next/server"
import { admin } from "@/lib/insforge"
import { PLAN_LIMITS, type PlanTier } from "@/lib/plan-limits"

async function getUserIdFromToken(token: string): Promise<string | null> {
  const baseUrl = process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"
  try {
    const res = await fetch(`${baseUrl}/api/auth/user`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.user?.id ?? data?.id ?? null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const userId = await getUserIdFromToken(token)
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    const { plan, annual } = body as { plan: string; annual: boolean }

    if (plan !== "pro" && plan !== "agency") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const limits = PLAN_LIMITS[plan as PlanTier]
    const now = new Date()
    const periodEnd = new Date(now)
    if (annual) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    const { data: existingSub } = await admin.database
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingSub) {
      await admin.database
        .from("subscriptions")
        .update({
          plan,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          monthly_opportunity_quota: limits.opportunities,
          monthly_proposal_quota: limits.proposals,
          updated_at: now.toISOString(),
        })
        .eq("id", (existingSub as { id: string }).id)
    } else {
      await admin.database
        .from("subscriptions")
        .insert([{
          user_id: userId,
          plan,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          monthly_opportunity_quota: limits.opportunities,
          monthly_proposal_quota: limits.proposals,
        }])
    }

    await admin.database
      .from("profiles")
      .update({ plan, updated_at: now.toISOString() })
      .eq("id", userId)

    return NextResponse.json({
      success: true,
      plan,
      annual,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://seerist.xyz"}/settings/billing?success=true`,
    })
  } catch (err) {
    console.error("Checkout error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
