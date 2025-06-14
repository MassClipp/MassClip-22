"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"

interface ProfileViewTrackerProps {
  profileUserId: string
  trackingMethod?: "api" | "client" | "both"
}

export default function ProfileViewTracker({ profileUserId, trackingMethod = "both" }: ProfileViewTrackerProps) {
  const { user } = useAuth()
  const hasTracked = useRef(false)

  useEffect(() => {
    // Prevent multiple tracking calls
    if (hasTracked.current) return

    const trackView = async () => {
      try {
        // Don't track self-views
        if (user?.uid === profileUserId) {
          console.log(`⏭️ Skipping self-view for user: ${profileUserId}`)
          return
        }

        console.log(`👁️ Tracking profile view for: ${profileUserId}`)

        // Track via API (server-side)
        if (trackingMethod === "api" || trackingMethod === "both") {
          try {
            const response = await fetch("/api/track-profile-view", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                profileUserId,
                viewerId: user?.uid,
              }),
            })

            if (response.ok) {
              console.log(`✅ Profile view tracked via API for: ${profileUserId}`)
            } else {
              console.warn(`⚠️ API tracking failed for: ${profileUserId}`)
            }
          } catch (apiError) {
            console.error("API tracking error:", apiError)
          }
        }

        // Track via client (fallback)
        if (trackingMethod === "client" || trackingMethod === "both") {
          try {
            const { ProfileViewTracker } = await import("@/lib/profile-view-tracker")
            await ProfileViewTracker.trackProfileViewClient(profileUserId, user?.uid)
            console.log(`✅ Profile view tracked via client for: ${profileUserId}`)
          } catch (clientError) {
            console.error("Client tracking error:", clientError)
          }
        }

        hasTracked.current = true
      } catch (error) {
        console.error("Error tracking profile view:", error)
      }
    }

    // Track view after a short delay to ensure the page has loaded
    const timer = setTimeout(trackView, 1500)

    return () => {
      clearTimeout(timer)
    }
  }, [profileUserId, user?.uid, trackingMethod])

  return null // This component doesn't render anything
}
