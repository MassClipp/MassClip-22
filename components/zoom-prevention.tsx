"use client"

import { useUserPlan } from "@/hooks/use-user-plan"
import { useEffect } from "react"

export function ZoomPrevention() {
  const { isProUser, loading } = useUserPlan()

  useEffect(() => {
    // Only apply zoom prevention for free users
    if (loading) return

    // Find existing viewport meta tag or create a new one
    let viewportMeta = document.querySelector('meta[name="viewport"]')
    const originalContent = viewportMeta?.getAttribute("content") || ""

    if (!isProUser) {
      // For free users: Disable zooming
      if (!viewportMeta) {
        viewportMeta = document.createElement("meta")
        viewportMeta.setAttribute("name", "viewport")
        document.head.appendChild(viewportMeta)
      }
      viewportMeta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no")

      // Add CSS classes to prevent gesture-based zoom
      document.documentElement.classList.add("prevent-zoom")
      document.body.classList.add("prevent-zoom")
    } else {
      // For pro users: Allow normal zooming
      if (viewportMeta && originalContent) {
        viewportMeta.setAttribute("content", originalContent)
      }

      // Remove CSS classes
      document.documentElement.classList.remove("prevent-zoom")
      document.body.classList.remove("prevent-zoom")
    }

    // Cleanup function
    return () => {
      if (viewportMeta && originalContent) {
        viewportMeta.setAttribute("content", originalContent)
      }
      document.documentElement.classList.remove("prevent-zoom")
      document.body.classList.remove("prevent-zoom")
    }
  }, [isProUser, loading])

  return null
}
