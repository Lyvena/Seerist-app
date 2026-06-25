import { NextRequest, NextResponse } from "next/server"
import { refreshAuth } from "@insforge/sdk/ssr"

// Token-refresh route consumed by the InsForge browser client. Exchanges the
// refresh-token cookie for a fresh access token and rewrites the httpOnly auth
// cookies on the response.
export async function POST(request: NextRequest) {
  try {
    const { response } = await refreshAuth({ request })
    return response
  } catch (err) {
    console.error("Token refresh failed:", err)
    return NextResponse.json({ error: "Refresh failed" }, { status: 401 })
  }
}
