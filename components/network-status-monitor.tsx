"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WifiOff, AlertTriangle } from "lucide-react"

export default function NetworkStatusMonitor() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionQuality, setConnectionQuality] = useState<"good" | "poor" | "offline">("good")

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
      if (!navigator.onLine) {
        setConnectionQuality("offline")
      }
    }

    const testConnectionQuality = async () => {
      if (!navigator.onLine) {
        setConnectionQuality("offline")
        return
      }

      try {
        const start = Date.now()
        const response = await fetch("/api/health", {
          method: "HEAD",
          cache: "no-cache",
        })
        const duration = Date.now() - start

        if (response.ok) {
          setConnectionQuality(duration > 2000 ? "poor" : "good")
        } else {
          setConnectionQuality("poor")
        }
      } catch (error) {
        console.warn("Connection quality test failed:", error)
        setConnectionQuality("poor")
      }
    }

    // Initial check
    updateOnlineStatus()
    testConnectionQuality()

    // Set up event listeners
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)

    // Periodic connection quality checks
    const qualityInterval = setInterval(testConnectionQuality, 30000)

    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
      clearInterval(qualityInterval)
    }
  }, [])

  if (connectionQuality === "offline") {
    return (
      <Alert className="border-red-200 bg-red-50 mb-4">
        <WifiOff className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>No internet connection.</strong> Please check your connection and try again.
        </AlertDescription>
      </Alert>
    )
  }

  if (connectionQuality === "poor") {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 mb-4">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Poor connection detected.</strong> Product box creation may be slower than usual.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
