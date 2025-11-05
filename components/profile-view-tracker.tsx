"use client"

import { useEffect } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface ProfileViewTrackerProps {
  profileUserId: string
}

export default function ProfileViewTracker({ profileUserId }: ProfileViewTrackerProps) {
  const { user } = useFirebaseAuth()

  useEffect(() => {
    const trackView = async () => {
      try {
        if (user?.uid === profileUserId) {
          console.log("[v0] Skipping self-view tracking")
          return
        }

        console.log(`[v0] Tracking profile view for: ${profileUserId}`)

        const response = await fetch("/api/track-profile-view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profileUserId,
            viewerId: user?.uid || null,
          }),
        })

        const data = await response.json()

        if (data.success) {
          console.log(`[v0] Successfully tracked profile view`)
        } else {
          console.error(`[v0] Failed to track profile view:`, data.error)
        }
      } catch (error) {
        console.error("[v0] Error tracking profile view:", error)
      }
    }

    if (profileUserId) {
      const timer = setTimeout(trackView, 500)
      return () => clearTimeout(timer)
    }
  }, [profileUserId, user?.uid])

  return null
}
