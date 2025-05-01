"use client"

import { useState, useEffect } from "react"
import { X, ExternalLink } from "lucide-react"
import { isInTikTokBrowser } from "@/lib/browser-detection"

export function TikTokBrowserBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [hasClosedBanner, setHasClosedBanner] = useState(false)

  useEffect(() => {
    // Check if we're in TikTok browser and user hasn't dismissed the banner
    const isTikTok = isInTikTokBrowser()
    const hasDismissed = localStorage.getItem("tiktok_banner_dismissed") === "true"

    setIsVisible(isTikTok && !hasDismissed)
  }, [])

  const dismissBanner = () => {
    setIsVisible(false)
    setHasClosedBanner(true)
    localStorage.setItem("tiktok_banner_dismissed", "true")
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-white p-3 z-50 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ExternalLink className="h-4 w-4" />
          <p className="text-sm">For the best experience, tap the ••• in the corner and open in your browser</p>
        </div>
        <button onClick={dismissBanner} className="p-1 rounded-full hover:bg-white/20" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
