import { redirect } from "next/navigation"
import { insforgeAdmin } from "./insforge/client"

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

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

// Check if user has access to a feature based on plan
export async function checkFeatureAccess(
  userId: string,
  feature: "autoPropose" | "analytics" | "whiteLabel" | "apiAccess"
): Promise<boolean> {
  const { data: profile } = await insforgeAdmin.database
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle()
  
  const plan = (profile as { plan?: string })?.plan ?? "free"
  
  switch (feature) {
    case "autoPropose":
    case "analytics":
      return plan === "pro" || plan === "agency"
    case "whiteLabel":
    case "apiAccess":
      return plan === "agency"
    default:
      return false
  }
}