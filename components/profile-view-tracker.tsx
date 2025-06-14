"use client"

import { useEffect } from "react"
import { useAuthContext } from "@/contexts/auth-context"
import { trackProfileView } from "@/lib/profile-view-tracker"

interface ProfileViewTrackerProps {
  profileUserId: string
  /** Delay before tracking the view (in milliseconds) */
  delay?: number
}

export default function ProfileViewTracker({ profileUserId, delay = 1500 }: ProfileViewTrackerProps) {
  const { user } = useAuthContext()

  useEffect(() => {
    if (!profileUserId) return

    // Set a delay to ensure the page has loaded and it's a genuine view
    const timer = setTimeout(async () => {
      try {
        // Track using client-side method first
        await trackProfileView(profileUserId, user?.uid)

        // Also track via API for server-side logging (fallback)
        try {
          await fetch("/api/track-profile-view", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              profileUserId,
              viewerId: user?.uid,
            }),
          })
        } catch (apiError) {
          console.warn("API tracking failed, but client tracking succeeded:", apiError)
        }
      } catch (error) {
        console.error("Failed to track profile view:", error)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [profileUserId, user?.uid, delay])

  // This component doesn't render anything
  return null
}
