import { NextRequest } from "next/server"
import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"

const OSS_HOST = process.env.INSFORGE_URL

function buildEdgeBody(
  opp: Record<string, unknown>,
  product: Record<string, unknown> | null,
  userId: string
) {
  return {
    opportunity: {
      title: opp.title,
      description: opp.description ?? "",
      required_skills: opp.required_skills ?? [],
      budget_min: opp.budget_min,
      budget_max: opp.budget_max,
    },
    product: product
      ? {
          id: product.id,
          name: product.name,
          description: product.description,
          keywords: product.keywords,
          anti_keywords: product.anti_keywords,
        }
      : {
          id: "",
          name: "Unknown",
          description: "",
          keywords: [],
          anti_keywords: [],
        },
    user_id: userId,
  }
}

// Score a single opportunity via the score-opportunity edge function.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const { opportunity_id } = body ?? {}
    if (!opportunity_id) {
      return Response.json({ error: "opportunity_id required" }, { status: 400 })
    }

    const insforge = createServerClient({ cookies: await cookies() })
    const { data: userData, error: authError } = await insforge.auth.getCurrentUser()
    const userId = userData?.user?.id
    if (authError || !userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [{ data: opp }, { data: product }] = await Promise.all([
      insforge.database
        .from("opportunities")
        .select("id, title, description, required_skills, budget_min, budget_max, platforms!inner(name)")
        .eq("id", opportunity_id)
        .eq("user_id", userId)
        .maybeSingle(),
      insforge.database
        .from("products")
        .select("id, name, description, keywords, anti_keywords")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
    ])

    if (!opp) {
      return Response.json({ error: "Opportunity not found" }, { status: 404 })
    }

    if (!OSS_HOST) {
      return Response.json({ error: "Server is not configured" }, { status: 500 })
    }

    const accessToken = (await cookies()).get("insforge_access_token")?.value
    const edgeResponse = await fetch(`${OSS_HOST}/functions/score-opportunity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(buildEdgeBody(opp as Record<string, unknown>, product as Record<string, unknown> | null, userId)),
    })

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text()
      return Response.json({ error: "Scoring failed", detail: errorText }, { status: edgeResponse.status })
    }

    const result = await edgeResponse.json()

    // Persist the score, scoped to this user.
    await insforge.database
      .from("opportunities")
      .update({
        ai_score: result.total_score,
        ai_score_breakdown: result,
        updated_at: new Date().toISOString(),
      })
      .eq("id", opportunity_id)
      .eq("user_id", userId)

    return Response.json({ success: true, score: result })
  } catch (err) {
    console.error("opportunities/score POST error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Batch-refresh scores for opportunities that don't have one yet.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const { opportunity_ids } = body ?? {}
    if (!Array.isArray(opportunity_ids) || !opportunity_ids.length) {
      return Response.json({ error: "opportunity_ids array required" }, { status: 400 })
    }

    const insforge = createServerClient({ cookies: await cookies() })
    const { data: userData, error: authError } = await insforge.auth.getCurrentUser()
    const userId = userData?.user?.id
    if (authError || !userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!OSS_HOST) {
      return Response.json({ error: "Server is not configured" }, { status: 500 })
    }

    const { data: opportunities } = await insforge.database
      .from("opportunities")
      .select("id, title, description, required_skills, budget_min, budget_max, platforms!inner(name)")
      .in("id", opportunity_ids)
      .eq("user_id", userId)
      .is("ai_score", null)

    const { data: product } = await insforge.database
      .from("products")
      .select("id, name, description, keywords, anti_keywords")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()

    const accessToken = (await cookies()).get("insforge_access_token")?.value
    const results = await Promise.allSettled(
      ((opportunities ?? []) as Array<Record<string, unknown>>).map((opp) =>
        fetch(`${OSS_HOST}/functions/score-opportunity`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(
            buildEdgeBody(opp, product as Record<string, unknown> | null, userId)
          ),
        })
      )
    )

    const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.ok).length
    const failed = results.length - succeeded
    if (failed > 0) {
      console.warn(`score PUT: ${failed}/${results.length} edge calls failed`)
    }

    return Response.json({ queued: results.length, succeeded, failed })
  } catch (err) {
    console.error("opportunities/score PUT error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
