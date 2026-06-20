import { NextRequest } from "next/server"
import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"

const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 10
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 }
  }
  entry.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count }
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const insforge = createServerClient({ cookies: await cookies() })
  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id ?? ""

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateCheck = checkRateLimit(userId)
  if (!rateCheck.allowed) {
    return Response.json({ error: "Rate limit exceeded. Maximum 10 proposals per minute." }, { status: 429 })
  }

  const authHeader = request.headers.get("Authorization") ?? ""

  const ossHost = process.env.INSFORGE_URL ?? "https://x69u73wi.eu-central.insforge.app"
  const functionUrl = `${ossHost}/functions/generate-proposal`

  const edgeResponse = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  })

  if (!edgeResponse.ok) {
    const errorText = await edgeResponse.text()
    return Response.json({ error: "Edge function failed", detail: errorText }, { status: edgeResponse.status })
  }

  const encoder = new TextEncoder()
  const reader = edgeResponse.body?.getReader()
  if (!reader) {
    return Response.json({ error: "No response stream" }, { status: 502 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
          break
        }
        controller.enqueue(encoder.encode(decoder.decode(value, { stream: true })))
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
