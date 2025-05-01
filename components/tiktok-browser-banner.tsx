"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { isInTikTokBrowser } from "@/lib/browser-detection"

export const TikTokBrowserBanner = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if we're in TikTok browser and if the banner has been dismissed before
    const isTikTok = isInTikTokBrowser()
    const bannerDismissed = localStorage.getItem("tiktok-banner-dismissed") === "true"

    setIsVisible(isTikTok && !bannerDismissed)
  }, [])

  const dismissBanner = () => {
    localStorage.setItem("tiktok-banner-dismissed", "true")
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-3 z-50 flex justify-between items-center">
      <p className="text-sm">For the best experience, tap the ••• in the corner and open in your browser.</p>
      <button
        onClick={dismissBanner}
        className="ml-2 p-1 rounded-full hover:bg-blue-700 transition-colors"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
    </div>
  )
}

export default TikTokBrowserBanner
