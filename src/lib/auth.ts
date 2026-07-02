import { redirect } from "next/navigation"
import { insforgeAdmin } from "./insforge/client"
import { canUseFeature as canUseFeaturePlan } from "./plan-limits"

export async function requireUser(): Promise<string> {
  const { cookies } = await import("next/headers")
  const { createServerClient } = await import("@insforge/sdk/ssr")

  const insforge = createServerClient({ cookies: await cookies() })
  const { data, error } = await insforge.auth.getCurrentUser()

  if (error || !data?.user?.id) {
    redirect("/login")
  }
  return data.user.id
}

/** Returns both the user id and email — use when you need the email for owner
 * checks or personalization. */
export async function requireUserWithEmail(): Promise<{ id: string; email: string }> {
  const { cookies } = await import("next/headers")
  const { createServerClient } = await import("@insforge/sdk/ssr")

  const insforge = createServerClient({ cookies: await cookies() })
  const { data, error } = await insforge.auth.getCurrentUser()

  if (error || !data?.user?.id) {
    redirect("/login")
  }
  return { id: data.user.id, email: data.user.email ?? "" }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

// Check if user has access to a feature based on plan (owner always has access)
export async function checkFeatureAccess(
  userId: string,
  feature: "autoPropose" | "analytics" | "whiteLabel" | "apiAccess"
): Promise<boolean> {
  // Fetch plan + email in one go (email from auth.users via the admin client).
  const { data: profile } = await insforgeAdmin.database
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle()
  const plan = (profile as { plan?: string })?.plan ?? "free"

  // Look up email for owner check.
  const { data: userRow } = await insforgeAdmin.database
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle()
  const email = (userRow as { email?: string } | null)?.email

  return canUseFeaturePlan(plan, feature, email)
}
