"use client"

import { useState, useEffect } from "react"
import { useFirebaseAuth } from "./use-firebase-auth"

export type UserTier = "free" | "creator_pro"

export interface TierInfo {
  tier: UserTier
  downloadsUsed: number
  downloadsLimit: number | null
  bundlesCreated: number
  bundlesLimit: number | null
  maxVideosPerBundle: number | null
  platformFeePercentage: number
  reachedDownloadLimit: boolean
  reachedBundleLimit: boolean
}

export function useUserTier() {
  const { user } = useFirebaseAuth()
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setTierInfo(null)
      setLoading(false)
      return
    }

    const fetchTierInfo = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/user/tier-info")
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch tier info")
        }

        setTierInfo(data.tierInfo)
      } catch (err) {
        console.error("❌ Error fetching tier info:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchTierInfo()
  }, [user])

  const incrementDownload = async (): Promise<{ success: boolean; reason?: string }> => {
    try {
      const response = await fetch("/api/user/increment-download", {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        return { success: false, reason: data.reason || "Failed to increment download" }
      }

      // Refresh tier info after successful increment
      const tierResponse = await fetch("/api/user/tier-info")
      const tierData = await tierResponse.json()
      if (tierResponse.ok) {
        setTierInfo(tierData.tierInfo)
      }

      return { success: true }
    } catch (err) {
      console.error("❌ Error incrementing download:", err)
      return { success: false, reason: "Network error" }
    }
  }

  const incrementBundle = async (): Promise<{ success: boolean; reason?: string }> => {
    try {
      const response = await fetch("/api/user/increment-bundle", {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        return { success: false, reason: data.reason || "Failed to increment bundle" }
      }

      // Refresh tier info after successful increment
      const tierResponse = await fetch("/api/user/tier-info")
      const tierData = await tierResponse.json()
      if (tierResponse.ok) {
        setTierInfo(tierData.tierInfo)
      }

      return { success: true }
    } catch (err) {
      console.error("❌ Error incrementing bundle:", err)
      return { success: false, reason: "Network error" }
    }
  }

  return {
    tierInfo,
    loading,
    error,
    incrementDownload,
    incrementBundle,
    isProUser: tierInfo?.tier === "creator_pro",
    isFreeUser: tierInfo?.tier === "free",
  }
}
