"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { insforge } from "@/lib/insforge-browser"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    insforge.auth.getCurrentUser().then(({ data }) => {
      if (data?.user?.id) {
        router.replace("/dashboard")
      } else {
        router.replace("/login")
      }
    })
  }, [router])

  return null
}