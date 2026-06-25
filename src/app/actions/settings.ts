"use server"

import { requireUser } from "@/lib/auth"
import { admin } from "@/lib/insforge"
import { revalidatePath } from "next/cache"

export async function updateProfile(
  data: {
    full_name: string
    company_name: string
    website: string
    timezone: string
  }
) {
  const userId = await requireUser()
  const { error } = await admin.database
    .from("profiles")
    .update({
      full_name: data.full_name,
      company_name: data.company_name,
      website: data.website || null,
      timezone: data.timezone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) return { error: error.message }
  revalidatePath("/settings/profile")
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const userId = await requireUser()
  const file = formData.get("avatar") as File | null
  if (!file) return { error: "No file provided" }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Invalid file type. Accepted: jpg, png, webp" }
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: "File too large. Max 2MB" }
  }

  const ext = file.name.split(".").pop() ?? "png"
  const key = `avatars/${userId}/${Date.now()}.${ext}`

  const { error: uploadError } = await admin.storage.from("avatars").upload(key, file)
  if (uploadError) return { error: uploadError.message }

  const { error: updateError } = await admin.database
    .from("profiles")
    .update({ avatar_url: key, updated_at: new Date().toISOString() })
    .eq("id", userId)

  if (updateError) return { error: updateError.message }
  revalidatePath("/settings/profile")
  return { success: true, url: key }
}

export async function exportUserData() {
  const userId = await requireUser()
  const [products, opportunities, proposals, pipeline, activity] = await Promise.all([
    admin.database.from("products").select("*").eq("user_id", userId).then((r) => r.data ?? []),
    admin.database.from("opportunities").select("*").eq("user_id", userId).then((r) => r.data ?? []),
    admin.database.from("proposals").select("*").eq("user_id", userId).then((r) => r.data ?? []),
    admin.database.from("pipeline_entries").select("*").eq("user_id", userId).then((r) => r.data ?? []),
    admin.database
      .from("activity_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500)
      .then((r) => r.data ?? []),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    products,
    opportunities,
    proposals,
    pipeline,
    activity,
    total_records:
      (products as unknown[]).length +
      (opportunities as unknown[]).length +
      (proposals as unknown[]).length +
      (pipeline as unknown[]).length +
      (activity as unknown[]).length,
  }

  const json = JSON.stringify(exportData, null, 2)
  const key = `exports/${userId}/${Date.now()}.json`

  // Build a Blob from the JSON string (supported in the Next.js runtime).
  const { error: uploadError } = await admin.storage
    .from("exports")
    .upload(key, new Blob([json], { type: "application/json" }))

  if (uploadError) return { error: uploadError.message }

  const { data: downloadData, error: downloadError } = await admin.storage
    .from("exports")
    .createSignedUrl(key, 300)

  if (downloadError || !downloadData) return { error: "Failed to generate download link" }

  return { success: true, url: (downloadData as { signedUrl: string }).signedUrl }
}

export async function deleteAccount() {
  const userId = await requireUser()
  try {
    // Mark subscription cancelled (DB CHECK only allows "cancelled", not "canceled").
    await admin.database
      .from("subscriptions")
      .update({ status: "cancelled", cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)

    // User data is removed by ON DELETE CASCADE foreign keys when the auth user
    // is deleted. Storage objects (avatars/exports) are best-effort; list+remove
    // individual objects rather than a prefix, which storage.remove() ignores.
    const baseUrl = process.env.INSFORGE_URL
    const apiKey = process.env.INSFORGE_API_KEY
    if (!baseUrl || !apiKey) {
      return { error: "Server is not configured to delete accounts." }
    }

    const res = await fetch(`${baseUrl}/api/admin/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown error")
      return { error: `Failed to delete user: ${text.slice(0, 200)}` }
    }

    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete account" }
  }
}
