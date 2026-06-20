import { createServerClient } from "@insforge/sdk/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import DangerZoneClient from "./DangerZoneClient"

export default async function DangerPage() {
  const insforge = createServerClient({ cookies: await cookies() })
  const { data: userData, error } = await insforge.auth.getCurrentUser()
  const userId = userData?.user?.id ?? ""
  if (error || !userId) redirect("/login")

  return <DangerZoneClient userId={userId} />
}
