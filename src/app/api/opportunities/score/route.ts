import { NextRequest } from "next/server"
import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { opportunity_id } = body

  if (!opportunity_id) {
    return Response.json({ error: "opportunity_id required" }, { status: 400 })
  }

  const insforge = createServerClient({ cookies: await cookies() })
  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get opportunity and product
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

  // Call edge function for scoring
  const ossHost = process.env.NEXT_PUBLIC_INSFORGE_URL ?? process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"
  const authHeader = request.headers.get("Authorization") ?? ""

  const edgeResponse = await fetch(`${ossHost}/functions/score-opportunity`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader || `Bearer ${process.env.INSFORGE_API_KEY}`,
    },
    body: JSON.stringify({
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
    }),
  })

  if (!edgeResponse.ok) {
    const errorText = await edgeResponse.text()
    return Response.json({ error: "Scoring failed", detail: errorText }, { status: edgeResponse.status })
  }

  const result = await edgeResponse.json()

  // Update opportunity with score
  await insforge.database
    .from("opportunities")
    .update({
      ai_score: result.total_score,
      ai_score_breakdown: result,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opportunity_id)

  return Response.json({ success: true, score: result })
}

// Batch refresh scores
export async function PUT(request: NextRequest) {
  const { opportunity_ids } = await request.json()

  if (!Array.isArray(opportunity_ids) || !opportunity_ids.length) {
    return Response.json({ error: "opportunity_ids array required" }, { status: 400 })
  }

  const insforge = createServerClient({ cookies: await cookies() })
  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Queue scoring for opportunities without scores
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

  // Trigger background scoring via edge function
  const ossHost = process.env.NEXT_PUBLIC_INSFORGE_URL ?? process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"

  for (const opp of opportunities ?? []) {
    fetch(`${ossHost}/functions/score-opportunity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INSFORGE_API_KEY}`,
      },
      body: JSON.stringify({
        opportunity: {
          title: opp.title,
          description: opp.description ?? "",
          required_skills: opp.required_skills ?? [],
          budget_min: opp.budget_min,
          budget_max: opp.budget_max,
        },
        product: product
          ? { id: product.id, name: product.name, description: product.description, keywords: product.keywords, anti_keywords: product.anti_keywords }
          : { id: "", name: "Unknown", description: "", keywords: [], anti_keywords: [] },
        user_id: userId,
      }),
    }).catch(() => {})
  }

  return Response.json({ queued: (opportunities ?? []).length })
}