"use client"

import { useEffect } from "react"
import { isInTikTokBrowser } from "@/lib/browser-detection"

export const FullscreenBlocker = () => {
  useEffect(() => {
    // Only apply fullscreen blocking in TikTok browser
    if (!isInTikTokBrowser()) return

    // Store original methods
    const originalRequestFullscreen = Element.prototype.requestFullscreen

    // Simple override that still allows the method to be called but prevents actual fullscreen
    Element.prototype.requestFullscreen = () => {
      console.log("Fullscreen request intercepted")
      // Return a resolved promise to prevent errors, but don't actually go fullscreen
      return Promise.resolve()
    }

    // Handle fullscreen change events - exit immediately if somehow triggered
    const exitFullscreen = () => {
      if (document.fullscreenElement && isInTikTokBrowser()) {
        document.exitFullscreen().catch((err) => console.log("Error exiting fullscreen:", err))
      }
    }

    document.addEventListener("fullscreenchange", exitFullscreen)

    return () => {
      // Restore original methods on cleanup
      Element.prototype.requestFullscreen = originalRequestFullscreen
      document.removeEventListener("fullscreenchange", exitFullscreen)
    }
  }, [])

  // No visible UI - this is just for the effect
  return null
}

// Add default export as well to support both import styles
export default FullscreenBlocker
