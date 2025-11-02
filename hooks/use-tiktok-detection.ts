"use client"

import { useState, useEffect } from "react"
import { isInTikTokBrowser, getBrowserEnvironment } from "@/lib/browser-detection"

export function useTikTokDetection() {
  const [isTikTok, setIsTikTok] = useState(false)
  const [browserEnvironment, setBrowserEnvironment] = useState<string>("unknown")
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Only run on client
    if (typeof window !== "undefined") {
      setIsTikTok(isInTikTokBrowser())
      setBrowserEnvironment(getBrowserEnvironment())
      setIsLoaded(true)
    }
  }, [])

  return {
    isTikTok,
    browserEnvironment,
    isLoaded,
  }
}
