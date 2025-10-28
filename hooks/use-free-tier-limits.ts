"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-firebase-auth"

interface FreeTierLimits {
  tier: "free"
  downloadsUsed: number
  downloadsLimit: number
  bundlesCreated: number
  bundlesLimit: number
  maxVideosPerBundle: number
  platformFeePercentage: number
  reachedDownloadLimit: boolean
  reachedBundleLimit: boolean
  hasUnlimitedDownloads: boolean
  hasPremiumContent: boolean
  hasNoWatermark: boolean
  hasPrioritySupport: boolean
  hasLimitedOrganization: boolean
  daysUntilReset: number
}

export function useFreeTierLimits() {
  const { user } = useAuth()
  const [limits, setLimits] = useState<FreeTierLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLimits = async () => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log("[v0] ===== FETCHING FREE TIER LIMITS =====")
      console.log("[v0] User UID:", user.uid)

      const response = await fetch(`/api/user/free-limits?uid=${user.uid}`)
      const result = await response.json()

      console.log("[v0] API Response:", {
        success: result.success,
        limits: result.limits,
        error: result.error,
      })
      console.log("[v0] Full response object:", JSON.stringify(result, null, 2))
      console.log("[v0] ========================================")

      if (result.success) {
        setLimits(result.limits)
        setError(null)
      } else {
        setError(result.error || "Failed to fetch limits")
      }
    } catch (err) {
      console.error("[v0] ❌ Error fetching free tier limits:", err)
      setError("Failed to fetch limits")
    } finally {
      setLoading(false)
    }
  }

  const incrementDownload = async () => {
    if (!user?.uid) return { success: false, reason: "Not authenticated" }

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/user/increment-free-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ type: "download" }),
      })

      const result = await response.json()

      if (result.success) {
        // Refresh limits after successful increment
        await fetchLimits()
      }

      return result
    } catch (err) {
      console.error("Error incrementing download:", err)
      return { success: false, reason: "Network error" }
    }
  }

  const incrementBundle = async () => {
    if (!user?.uid) return { success: false, reason: "Not authenticated" }

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/user/increment-free-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ type: "bundle" }),
      })

      const result = await response.json()

      if (result.success) {
        // Refresh limits after successful increment
        await fetchLimits()
      }

      return result
    } catch (err) {
      console.error("Error incrementing bundle:", err)
      return { success: false, reason: "Network error" }
    }
  }

  const checkVideoLimit = async (currentVideoCount: number) => {
    if (!user?.uid) return { success: false, reason: "Not authenticated" }

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/user/increment-free-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ type: "check-video-limit", currentVideoCount }),
      })

      const result = await response.json()
      return result
    } catch (err) {
      console.error("Error checking video limit:", err)
      return { success: false, reason: "Network error" }
    }
  }

  useEffect(() => {
    fetchLimits()
  }, [user?.uid])

  return {
    limits,
    loading,
    error,
    refetch: fetchLimits,
    incrementDownload,
    incrementBundle,
    checkVideoLimit,
  }
}
