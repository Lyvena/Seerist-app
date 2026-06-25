import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@insforge/sdk/ssr"
import type { CookieStore, CookieOptions } from "@insforge/sdk/ssr"

// Adapt Next.js cookies to the InsForge CookieStore interface.
// Next's RequestCookies.get() returns { name, value } | undefined, while the
// SDK expects a plain string | { value } | undefined. The writer is cast
// through a tuple type to satisfy the SDK's overloaded set/delete signatures.
type NextCookieJar = NextRequest["cookies"] | NextResponse["cookies"]

function toCookieStore(cookies: NextCookieJar): CookieStore {
  const writer = {
    set(name: string, value: string, options?: CookieOptions) {
      // Next's ResponseCookies.set accepts (name, value, options); RequestCookies
      // is read-only in middleware so we only ever write to the response cookies.
      cookies.set(name, value, options as never)
    },
    delete(name: string) {
      cookies.delete(name)
    },
  }
  return {
    get: (name: string) => {
      const c = cookies.get(name)
      return c ? { value: c.value } : undefined
    },
    set: writer.set,
    delete: writer.delete,
  } as unknown as CookieStore
}

// Refresh the InsForge auth session on every matching request and route the
// user to the right place: authenticated users go to the app dashboard;
// unauthenticated users hitting `/` or protected routes go to login.
// (Named "proxy" per the Next.js 16 middleware→proxy convention.)
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  await updateSession({
    requestCookies: toCookieStore(request.cookies),
    responseCookies: toCookieStore(response.cookies),
  })

  const hasAccessToken = Boolean(request.cookies.get("insforge_access_token")?.value)
  const { pathname } = request.nextUrl
  const isRoot = pathname === "/"
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/forgot-password") || pathname.startsWith("/callback")

  if (isRoot) {
    const url = request.nextUrl.clone()
    url.pathname = hasAccessToken ? "/dashboard" : "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  // Authenticated users visiting auth pages are sent to the dashboard.
  if (hasAccessToken && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Run on everything except static assets, Next internals, API, and OG images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|og|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|woff2?|ttf|otf|css|js|txt|xml|ico)$).*)",
  ],
}
