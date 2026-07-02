import { NextRequest, NextResponse } from "next/server"
import { createServerClient, getAccessTokenCookieName } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { checkOrigin } from "@/lib/csrf"

// Triggers the monitor-orchestrator edge function on behalf of the logged-in
// user. Authenticated via the user's session cookie (not the admin key).
export async function POST(request: NextRequest) {
  const originError = checkOrigin(request)
  if (originError) return originError

  try {
    const insforge = createServerClient({ cookies: await cookies() })
    const { data: userData, error: authError } = await insforge.auth.getCurrentUser()
    const userId = userData?.user?.id
    if (authError || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const platform_slug = typeof body?.platform_slug === "string" ? body.platform_slug : null
    if (!platform_slug) {
      return NextResponse.json({ error: "platform_slug is required" }, { status: 400 })
    }

    const accessToken = (await cookies()).get(getAccessTokenCookieName())?.value
    const ossHost = process.env.INSFORGE_URL
    if (!ossHost) {
      return NextResponse.json({ error: "Server is not configured" }, { status: 500 })
    }

    const edgeResponse = await fetch(`${ossHost}/functions/monitor-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ user_id: userId, platform_slug }),
    })

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text()
      return NextResponse.json(
        { error: "Scan trigger failed", detail: errorText },
        { status: edgeResponse.status }
      )
    }

    const result = await edgeResponse.json()
    return NextResponse.json({ success: true, result })
  } catch (err) {
    console.error("monitor/trigger error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
