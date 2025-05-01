"use client"

import { useState, useEffect } from "react"
import { X, ExternalLink } from "lucide-react"
import { isInTikTokBrowser } from "@/lib/browser-detection"

export function TikTokBrowserBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isTikTok, setIsTikTok] = useState(false)

  useEffect(() => {
    // Check if we're in TikTok browser
    const tikTokBrowser = isInTikTokBrowser()
    setIsTikTok(tikTokBrowser)
    setIsVisible(tikTokBrowser)
  }, [])

  if (!isVisible) return null

  const handleOpenInBrowser = () => {
    // Try to open the current URL in the device's default browser
    const currentUrl = window.location.href
    window.open(currentUrl, "_blank")
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-white p-3 z-50 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="text-sm">
          <p className="font-medium">Videos are blurred in TikTok</p>
          <p className="text-xs text-gray-300">Open in your browser for full quality</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleOpenInBrowser}
          className="bg-white text-black text-xs px-3 py-1.5 rounded-full flex items-center space-x-1"
        >
          <ExternalLink size={12} />
          <span>Open</span>
        </button>
        <button onClick={() => setIsVisible(false)} className="p-1.5 rounded-full hover:bg-white/20">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
