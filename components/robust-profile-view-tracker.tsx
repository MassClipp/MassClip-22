"use client"

import { useEffect, useRef } from "react"
import { useAuthContext } from "@/contexts/auth-context"

interface RobustProfileViewTrackerProps {
  profileUserId: string
  delay?: number
}

export default function RobustProfileViewTracker({ profileUserId, delay = 2000 }: RobustProfileViewTrackerProps) {
  const { user } = useAuthContext()
  const hasTracked = useRef(false)
  const trackingTimeout = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const trackView = async () => {
      try {
        // Prevent multiple tracking attempts
        if (hasTracked.current) {
          return
        }

        // Don't track self-views
        if (user?.uid === profileUserId) {
          console.log("🚫 [RobustProfileViewTracker] Skipping self-view")
          return
        }

        console.log(`🔍 [RobustProfileViewTracker] Tracking view for: ${profileUserId}`)

        const response = await fetch("/api/profile-views/track", {
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
          hasTracked.current = true
          console.log(`✅ [RobustProfileViewTracker] View tracked successfully. Count: ${data.viewCount}`)
        } else {
          console.log(`ℹ️ [RobustProfileViewTracker] View not tracked: ${data.error}`)
        }
      } catch (error) {
        console.error("❌ [RobustProfileViewTracker] Error tracking view:", error)
      }
    }

    if (profileUserId && !hasTracked.current) {
      // Clear any existing timeout
      if (trackingTimeout.current) {
        clearTimeout(trackingTimeout.current)
      }

      // Set up delayed tracking
      trackingTimeout.current = setTimeout(trackView, delay)
    }

    return () => {
      if (trackingTimeout.current) {
        clearTimeout(trackingTimeout.current)
      }
    }
  }, [profileUserId, user?.uid, delay])

  // Reset tracking flag when profile changes
  useEffect(() => {
    hasTracked.current = false
  }, [profileUserId])

  return null
}
