"use client"

import { useEffect } from "react"
import { isInTikTokBrowser } from "@/lib/browser-detection"

export const FullscreenBlocker = () => {
  useEffect(() => {
    // Only apply in TikTok browser
    if (!isInTikTokBrowser()) return

    // Store original methods
    const originalRequestFullscreen = Element.prototype.requestFullscreen
    const originalMsRequestFullscreen = Element.prototype.msRequestFullscreen
    const originalMozRequestFullScreen = Element.prototype.mozRequestFullScreen
    const originalWebkitRequestFullscreen = Element.prototype.webkitRequestFullscreen

    // Override fullscreen methods
    if (Element.prototype.requestFullscreen) {
      Element.prototype.requestFullscreen = () => {
        console.log("Fullscreen blocked in TikTok browser")
        return Promise.resolve()
      }
    }

    if (Element.prototype.msRequestFullscreen) {
      Element.prototype.msRequestFullscreen = () => {
        console.log("MS Fullscreen blocked in TikTok browser")
        return Promise.resolve()
      }
    }

    if (Element.prototype.mozRequestFullScreen) {
      Element.prototype.mozRequestFullScreen = () => {
        console.log("Moz Fullscreen blocked in TikTok browser")
        return Promise.resolve()
      }
    }

    if (Element.prototype.webkitRequestFullscreen) {
      Element.prototype.webkitRequestFullscreen = () => {
        console.log("Webkit Fullscreen blocked in TikTok browser")
        return Promise.resolve()
      }
    }

    // Block fullscreen change events
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => console.error(err))
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("mozfullscreenchange", handleFullscreenChange)
    document.addEventListener("MSFullscreenChange", handleFullscreenChange)

    // Cleanup
    return () => {
      // Restore original methods
      if (originalRequestFullscreen) {
        Element.prototype.requestFullscreen = originalRequestFullscreen
      }
      if (originalMsRequestFullscreen) {
        Element.prototype.msRequestFullscreen = originalMsRequestFullscreen
      }
      if (originalMozRequestFullScreen) {
        Element.prototype.mozRequestFullScreen = originalMozRequestFullScreen
      }
      if (originalWebkitRequestFullscreen) {
        Element.prototype.webkitRequestFullscreen = originalWebkitRequestFullscreen
      }

      // Remove event listeners
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange)
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange)
    }
  }, [])

  return null
}

// Add default export as well to support both import styles
export default FullscreenBlocker
