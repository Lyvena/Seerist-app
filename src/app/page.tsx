"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const { insforgeBrowser } = await import("@/lib/insforge/client")
      insforgeBrowser().auth.getCurrentUser().then(({ data }) => {
        if (data?.user?.id) {
          router.replace("/dashboard")
        } else {
          router.replace("/login")
        }
      })
    }
    checkAuth()
  }, [router])

  return null
}