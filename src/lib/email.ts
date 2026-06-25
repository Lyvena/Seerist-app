import { admin } from "@/lib/insforge"

// Resolve a user's email address for transactional email routes. These routes
// are invoked server-side by the monitor orchestrator with a userId. Email
// lives in the auth identity, so we look it up via the admin auth API
// (getProfile returns the user's auth profile which includes the email for
// service-key callers), with a caller-supplied fallback.
export async function resolveUserEmail(userId: string, fallback?: string): Promise<string | null> {
  if (fallback && fallback.includes("@")) return fallback

  try {
    const { data, error } = await admin.auth.getProfile(userId)
    if (error || !data) return null
    // profileSchema is passthrough; the auth API includes email for admin callers.
    const profile = data.profile as Record<string, unknown> | null
    const email = (profile?.email as string | undefined) ?? (data as unknown as { email?: string }).email
    if (email && email.includes("@")) return email
  } catch {
    /* fall through */
  }

  return null
}

// Constant-time string comparison to avoid timing-based secret checks.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
