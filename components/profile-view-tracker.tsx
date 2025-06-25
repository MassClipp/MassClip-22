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
        // Don't track self-views
        if (user?.uid === profileUserId) {
          console.log("Skipping self-view tracking")
          return
        }

        console.log(`🔍 [ProfileViewTracker] Tracking view for profile: ${profileUserId}`)

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
          console.log(`✅ [ProfileViewTracker] Successfully tracked view`)
        } else {
          console.error(`❌ [ProfileViewTracker] Failed to track view:`, data.error)
        }
      } catch (error) {
        console.error("❌ [ProfileViewTracker] Error tracking profile view:", error)
      }
    }

    if (profileUserId) {
      // Add a small delay to ensure the page has loaded
      const timer = setTimeout(trackView, 1000)
      return () => clearTimeout(timer)
    }
  }, [profileUserId, user?.uid])

  // This component doesn't render anything
  return null
}
