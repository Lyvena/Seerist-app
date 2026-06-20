import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ProfileClient from "./ProfileClient"

export default async function ProfilePage() {
  const insforge = createServerClient({ cookies: await cookies() })
  const { data: userData, error } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id ?? ""
  if (error || !userId) redirect("/login")

  const { data: profile } = await insforge.database
    .from("profiles")
    .select("full_name, avatar_url, company_name, website, timezone")
    .eq("id", userId)
    .maybeSingle()

  const email = userData.user?.email ?? ""

  const p = (profile ?? {}) as Record<string, unknown>

  return (
    <ProfileClient
      userId={userId}
      email={email}
      initialFullName={(p.full_name as string) ?? ""}
      initialAvatarUrl={(p.avatar_url as string) ?? ""}
      initialCompanyName={(p.company_name as string) ?? ""}
      initialWebsite={(p.website as string) ?? ""}
      initialTimezone={(p.timezone as string) ?? ""}
    />
  )
}
