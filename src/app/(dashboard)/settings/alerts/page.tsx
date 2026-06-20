import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { AlertPreferencesClient } from "./AlertPreferencesClient"

export default async function AlertPreferencesPage() {
  const insforge = createServerClient({ cookies: await cookies() })

  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id
  const userEmail = userData?.user?.email

  const { data: alertData } = await insforge.database
    .from("alert_preferences")
    .select("digest_frequency, min_score_for_alert, platforms_included")
    .eq("user_id", userId ?? "")
    .single()

  const { data: configsData } = await insforge.database
    .from("user_platform_configs")
    .select("platform_id, is_enabled")
    .eq("user_id", userId ?? "")
    .eq("is_enabled", true)

  const enabledPlatformIds = ((configsData ?? []) as Array<{ platform_id: string }>).map((c) => c.platform_id)

  const prefs = (alertData ?? {}) as {
    digest_frequency: string | null
    min_score_for_alert: number | null
    platforms_included: string[] | null
  }

  return (
    <AlertPreferencesClient
      userId={userId ?? ""}
      email={userEmail ?? ""}
      initialDigestFrequency={prefs.digest_frequency ?? "daily"}
      initialMinScore={prefs.min_score_for_alert ?? 60}
      initialPlatforms={prefs.platforms_included ?? enabledPlatformIds}
      enabledPlatformIds={enabledPlatformIds}
    />
  )
}
