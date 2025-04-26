"use client"

import { useEffect } from "react"
import { useMobile } from "@/hooks/use-mobile"

export function RedirectHelper() {
  const isMobile = useMobile()

  useEffect(() => {
    // Only run on mobile devices
    if (!isMobile) return

    // Check if we need to redirect
    const limitReached = localStorage.getItem("downloadLimitReached")

    if (limitReached === "true" && !window.location.pathname.includes("/dashboard")) {
      console.log("Redirect helper: Detected download limit reached, redirecting to dashboard")

      // Clear the flag to prevent redirect loops
      localStorage.removeItem("downloadLimitReached")

      // Redirect to dashboard
      window.location.href = "/dashboard"
    }

    // Set up a periodic check for mobile devices
    const intervalId = setInterval(() => {
      // Check if we have the download limit reached flag
      const limitReached = localStorage.getItem("downloadLimitReached")

      if (limitReached === "true" && !window.location.pathname.includes("/dashboard")) {
        console.log("Redirect helper: Detected download limit reached via interval")

        // Clear the flag to prevent redirect loops
        localStorage.removeItem("downloadLimitReached")

        // Redirect to dashboard
        window.location.href = "/dashboard"
      }
    }, 3000) // Check every 3 seconds

    return () => {
      clearInterval(intervalId)
    }
  }, [isMobile])

  return null
}
