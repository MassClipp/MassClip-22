"use client"

import { useEffect } from "react"
import { useTikTokDetection } from "@/hooks/use-tiktok-detection"

export function FullscreenBlocker() {
  const { isTikTokBrowser } = useTikTokDetection()

  useEffect(() => {
    // Only block fullscreen on the main window, not popups
    if (window.opener) {
      console.log("Fullscreen blocker: Skipping popup window")
      return
    }

    if (!isTikTokBrowser) return

    // Store original methods
    const originalRequestFullscreen = Element.prototype.requestFullscreen
    const originalMozRequestFullScreen = Element.prototype.mozRequestFullScreen
    const originalWebkitRequestFullscreen = Element.prototype.webkitRequestFullscreen
    const originalMsRequestFullscreen = Element.prototype.msRequestFullscreen

    // Override fullscreen methods
    Element.prototype.requestFullscreen = () => {
      console.log("Fullscreen blocked by TikTok browser restrictions")
      return Promise.reject(new Error("Fullscreen blocked"))
    }

    // Handle vendor prefixed versions
    if (Element.prototype.mozRequestFullScreen) {
      Element.prototype.mozRequestFullScreen = () => {
        console.log("Fullscreen blocked by TikTok browser restrictions (moz)")
        return Promise.reject(new Error("Fullscreen blocked"))
      }
    }

    if (Element.prototype.webkitRequestFullscreen) {
      Element.prototype.webkitRequestFullscreen = () => {
        console.log("Fullscreen blocked by TikTok browser restrictions (webkit)")
        return Promise.reject(new Error("Fullscreen blocked"))
      }
    }

    if (Element.prototype.msRequestFullscreen) {
      Element.prototype.msRequestFullscreen = () => {
        console.log("Fullscreen blocked by TikTok browser restrictions (ms)")
        return Promise.reject(new Error("Fullscreen blocked"))
      }
    }

    // Block postMessage requests for fullscreen
    const originalPostMessage = window.postMessage
    window.postMessage = function (message, targetOrigin, transfer) {
      // Check if the message is a fullscreen request
      if (
        typeof message === "object" &&
        message !== null &&
        (message.event === "fullscreenchange" ||
          message.method === "fullscreen" ||
          (message.method === "setFullscreen" && message.value === true))
      ) {
        console.log("Blocked fullscreen postMessage request", message)
        return
      }

      // Allow other messages to pass through
      return originalPostMessage.call(this, message, targetOrigin, transfer)
    }

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        console.log("Fullscreen detected, exiting...")
        document.exitFullscreen().catch((err) => {
          console.error("Error exiting fullscreen:", err)
        })
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F11 and other fullscreen shortcuts
      if (
        e.key === "F11" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") ||
        ((e.ctrlKey || e.metaKey) && e.key === "Enter")
      ) {
        e.preventDefault()
        e.stopPropagation()
        console.log("Fullscreen shortcut blocked")
      }
    }

    // Add event listeners
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("mozfullscreenchange", handleFullscreenChange)
    document.addEventListener("MSFullscreenChange", handleFullscreenChange)
    document.addEventListener("keydown", handleKeyDown, true)

    // Cleanup function to restore original methods
    return () => {
      Element.prototype.requestFullscreen = originalRequestFullscreen
      if (Element.prototype.mozRequestFullScreen) {
        Element.prototype.mozRequestFullScreen = originalMozRequestFullScreen
      }
      if (Element.prototype.webkitRequestFullscreen) {
        Element.prototype.webkitRequestFullscreen = originalWebkitRequestFullscreen
      }
      if (Element.prototype.msRequestFullscreen) {
        Element.prototype.msRequestFullscreen = originalMsRequestFullscreen
      }
      window.postMessage = originalPostMessage
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange)
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange)
      document.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [isTikTokBrowser])

  // This component doesn't render anything
  return null
}
