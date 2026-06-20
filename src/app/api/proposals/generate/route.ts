import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()

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
