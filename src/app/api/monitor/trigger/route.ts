import { NextRequest } from "next/server"
import { admin } from "@/lib/insforge"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { platform_slug } = body

  if (!platform_slug) {
    return Response.json({ error: "platform_slug is required" }, { status: 400 })
  }

  const authHeader = request.headers.get("Authorization") ?? ""

  const ossHost = process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"
  const functionUrl = `${ossHost}/functions/monitor-orchestrator`

  const { data: userData } = await admin.auth.getCurrentUser()
  const userId = userData?.user?.id

  const edgeResponse = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      user_id: userId,
      platform_slug,
    }),
  })

  if (!edgeResponse.ok) {
    const errorText = await edgeResponse.text()
    return Response.json({ error: "Scan trigger failed", detail: errorText }, { status: edgeResponse.status })
  }

  const result = await edgeResponse.json()

  return Response.json({ success: true, result })
}
