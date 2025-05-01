"use client"

import { useEffect } from "react"
import { setupVimeoMessageHandler } from "@/lib/vimeo-message-handler"

export const FullscreenBlocker = () => {
  useEffect(() => {
    // Override fullscreen API methods
    const originalRequestFullscreen = Element.prototype.requestFullscreen
    const originalMozRequestFullScreen = Element.prototype.mozRequestFullScreen
    const originalWebkitRequestFullscreen = Element.prototype.webkitRequestFullscreen
    const originalMsRequestFullscreen = Element.prototype.msRequestFullscreen

    // Block fullscreen requests
    Element.prototype.requestFullscreen = () => {
      console.log("Fullscreen request blocked")
      return Promise.reject(new Error("Fullscreen blocked"))
    }

    // Block vendor-prefixed variants
    if (Element.prototype.mozRequestFullScreen) {
      Element.prototype.mozRequestFullScreen = () => {
        console.log("Mozilla fullscreen request blocked")
        return Promise.reject(new Error("Fullscreen blocked"))
      }
    }

    if (Element.prototype.webkitRequestFullscreen) {
      Element.prototype.webkitRequestFullscreen = () => {
        console.log("Webkit fullscreen request blocked")
        return Promise.reject(new Error("Fullscreen blocked"))
      }
    }

    if (Element.prototype.msRequestFullscreen) {
      Element.prototype.msRequestFullscreen = () => {
        console.log("MS fullscreen request blocked")
        return Promise.reject(new Error("Fullscreen blocked"))
      }
    }

    // Exit fullscreen if it somehow gets triggered
    const exitFullscreen = () => {
      if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      ) {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen()
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen()
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen()
        }
      }
    }

    // Listen for fullscreen change events
    document.addEventListener("fullscreenchange", exitFullscreen)
    document.addEventListener("webkitfullscreenchange", exitFullscreen)
    document.addEventListener("mozfullscreenchange", exitFullscreen)
    document.addEventListener("MSFullscreenChange", exitFullscreen)

    // Set up Vimeo message handler
    setupVimeoMessageHandler()

    return () => {
      // Restore original methods on cleanup
      Element.prototype.requestFullscreen = originalRequestFullscreen
      if (originalMozRequestFullScreen) {
        Element.prototype.mozRequestFullScreen = originalMozRequestFullScreen
      }
      if (originalWebkitRequestFullscreen) {
        Element.prototype.webkitRequestFullscreen = originalWebkitRequestFullscreen
      }
      if (originalMsRequestFullscreen) {
        Element.prototype.msRequestFullscreen = originalMsRequestFullscreen
      }

      // Remove event listeners
      document.removeEventListener("fullscreenchange", exitFullscreen)
      document.removeEventListener("webkitfullscreenchange", exitFullscreen)
      document.removeEventListener("mozfullscreenchange", exitFullscreen)
      document.removeEventListener("MSFullscreenChange", exitFullscreen)
    }
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
        pointerEvents: "none", // Make it non-interactive
      }}
    />
  )
}

// Add default export as well to support both import styles
export default FullscreenBlocker
