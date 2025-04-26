"use client"

import { useEffect } from "react"
import { useMobile } from "@/hooks/use-mobile"

export function MobileReloadEnforcer() {
  const isMobile = useMobile()

  useEffect(() => {
    // Only run on mobile devices
    if (!isMobile) return

    // Check if we need to enforce a reload
    const lastReloadAttempt = localStorage.getItem("lastReloadAttempt")

    if (lastReloadAttempt) {
      const attemptTime = Number.parseInt(lastReloadAttempt, 10)
      const currentTime = Date.now()
      const timeSinceAttempt = currentTime - attemptTime

      // If the last reload attempt was less than 10 seconds ago but more than 5 seconds
      // This suggests the reload might have failed
      if (timeSinceAttempt < 10000 && timeSinceAttempt > 5000) {
        console.log("Mobile reload enforcer: Detected possible failed reload attempt")

        // Check if we have the download limit reached flag
        const limitReached = localStorage.getItem("downloadLimitReached")

        if (limitReached === "true") {
          console.log("Mobile reload enforcer: Forcing reload now")

          // Clear the timestamp to prevent infinite reload loops
          localStorage.removeItem("lastReloadAttempt")

          // Force an immediate reload
          window.location.reload(true)
        }
      } else if (timeSinceAttempt >= 10000) {
        // Clean up old timestamps
        localStorage.removeItem("lastReloadAttempt")
      }
    }

    // Set up a periodic check for mobile devices
    const intervalId = setInterval(() => {
      // Check if we have the download limit reached flag
      const limitReached = localStorage.getItem("downloadLimitReached")

      if (limitReached === "true") {
        console.log("Mobile reload enforcer: Detected download limit reached via interval")

        // Force a reload
        window.location.reload(true)
      }
    }, 5000) // Check every 5 seconds

    return () => {
      clearInterval(intervalId)
    }
  }, [isMobile])

  return null
}
