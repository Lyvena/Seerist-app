import { NextRequest } from "next/server"
import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"

const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 10
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  // Evict expired entries occasionally to keep the map bounded.
  if (rateLimitMap.size > 1000) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key)
    }
  }

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

// Streams an AI-generated proposal from the generate-proposal edge function.
// Authenticated via the user's session cookie; forwards the access token.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return Response.json({ error: "Invalid request body" }, { status: 400 })
    }

    const insforge = createServerClient({ cookies: await cookies() })
    const { data: userData, error: authError } = await insforge.auth.getCurrentUser()
    const userId = userData?.user?.id

    if (authError || !userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateCheck = checkRateLimit(userId)
    if (!rateCheck.allowed) {
      return Response.json(
        { error: "Rate limit exceeded. Maximum 10 proposals per minute." },
        { status: 429 }
      )
    }

    const accessToken = (await cookies()).get("insforge_access_token")?.value
    const ossHost = process.env.INSFORGE_URL
    if (!ossHost) {
      return Response.json({ error: "Server is not configured" }, { status: 500 })
    }

    const edgeResponse = await fetch(`${ossHost}/functions/generate-proposal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text()
      return Response.json(
        { error: "Edge function failed", detail: errorText },
        { status: edgeResponse.status }
      )
    }

    const reader = edgeResponse.body?.getReader()
    if (!reader) {
      return Response.json({ error: "No response stream" }, { status: 502 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.close()
              break
            }
            controller.enqueue(encoder.encode(decoder.decode(value, { stream: true })))
          }
        } catch (err) {
          controller.error(err)
        } finally {
          reader.releaseLock()
        }
      },
      cancel() {
        reader.cancel().catch(() => {})
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (err) {
    console.error("proposals/generate error:", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
