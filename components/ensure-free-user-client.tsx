"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"

export default function EnsureFreeUserClient() {
  const { user } = useAuth()
  const didEnsure = useRef<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!user) return
      if (didEnsure.current === user.uid) return

      try {
        const token = await user.getIdToken()
        const res = await fetch("/api/user/tracking/ensure-free-user", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) {
          console.error("❌ ensure-free-user failed:", data)
        } else {
          console.log("✅ ensured free user:", data)
          didEnsure.current = user.uid
        }
      } catch (e) {
        console.error("❌ ensure-free-user error:", e)
      }
    }
    run()
  }, [user])

  return null
}
