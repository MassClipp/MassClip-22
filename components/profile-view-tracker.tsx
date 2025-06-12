"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { TrackingService } from "@/lib/tracking-service"

interface ProfileViewTrackerProps {
  profileUserId: string
}

export default function ProfileViewTracker({ profileUserId }: ProfileViewTrackerProps) {
  const { user } = useAuth()

  useEffect(() => {
    const trackView = async () => {
      try {
        // Track the profile view
        await TrackingService.trackProfileView(profileUserId, user?.uid)
        console.log(`👁️ Profile view tracked for user: ${profileUserId}`)
      } catch (error) {
        console.error("Error tracking profile view:", error)
      }
    }

    // Track view after a short delay to ensure the page has loaded
    const timer = setTimeout(trackView, 1000)

    return () => clearTimeout(timer)
  }, [profileUserId, user?.uid])

  return null // This component doesn't render anything
}
