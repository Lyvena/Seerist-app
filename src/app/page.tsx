import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getAccessTokenCookieName } from "@insforge/sdk/ssr"

export default async function RootPage() {
  const cookieStore = await cookies()
  const accessTokenCookie = getAccessTokenCookieName()
  const hasSession = cookieStore.get(accessTokenCookie)?.value

  redirect(hasSession ? "/dashboard" : "/login")
}
