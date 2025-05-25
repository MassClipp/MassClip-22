"use client"

import { useEffect } from "react"
import { useTikTokDetection } from "@/hooks/use-tiktok-detection"

export function FullscreenBlocker() {
  const { isTikTokBrowser } = useTikTokDetection()

  useEffect(() => {
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
    }
  }, [isTikTokBrowser])

  // This component doesn't render anything
  return null
}
