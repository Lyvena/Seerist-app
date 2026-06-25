import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AlertPreferencesClient } from "./AlertPreferencesClient"
import { DIGEST_FREQUENCIES } from "@/lib/db/schemas"

type DigestFrequency = (typeof DIGEST_FREQUENCIES)[number]
const VALID_FREQUENCIES = new Set<string>(DIGEST_FREQUENCIES)

export default async function AlertPreferencesPage() {
  const insforge = createServerClient({ cookies: await cookies() })

  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id
  if (!userId) redirect("/login")
  const userEmail = userData?.user?.email

  const { data: alertData } = await insforge.database
    .from("alert_preferences")
    .select("digest_frequency, min_score_for_alert, platforms_included")
    .eq("user_id", userId)
    .maybeSingle()

  const { data: configsData } = await insforge.database
    .from("user_platform_configs")
    .select("platform_id, is_enabled")
    .eq("user_id", userId)
    .eq("is_enabled", true)

  const enabledPlatformIds = ((configsData ?? []) as Array<{ platform_id: string }>).map((c) => c.platform_id)

  const prefs = (alertData ?? {}) as {
    digest_frequency: string | null
    min_score_for_alert: number | null
    platforms_included: string[] | null
  }

  const frequency: DigestFrequency = VALID_FREQUENCIES.has(prefs.digest_frequency ?? "")
    ? (prefs.digest_frequency as DigestFrequency)
    : "daily"

  return (
    <AlertPreferencesClient
      userId={userId}
      email={userEmail ?? ""}
      initialDigestFrequency={frequency}
      initialMinScore={prefs.min_score_for_alert ?? 60}
      initialPlatforms={prefs.platforms_included ?? enabledPlatformIds}
      enabledPlatformIds={enabledPlatformIds}
    />
  )
}

