"use server"

import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard"

export default async function OnboardingPage() {
  const insforge = createServerClient({ cookies: await cookies() })

  const { data: userData } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id

  const { data: platformsData } = await insforge.database
    .from("platforms")
    .select("id, slug, name, logo_url, category")
    .eq("is_supported", true)
    .order("name")

  const platforms = platformsData ?? []
  const userEmail = userData?.user?.email ?? ""

  return <OnboardingWizard userId={userId ?? ""} platforms={platforms} userEmail={userEmail} />
}
