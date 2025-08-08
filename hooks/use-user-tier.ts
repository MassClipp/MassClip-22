import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-firebase-auth"

interface UserTierInfo {
  tier: "free" | "creator_pro"
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
  const { user } = useAuth()
  const [tierInfo, setTierInfo] = useState<UserTierInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTierInfo = async () => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/user/tracking/get-tier-info?uid=${user.uid}`)
      const result = await response.json()

      if (result.success) {
        setTierInfo(result.data)
        setError(null)
      } else {
        setError(result.error || "Failed to fetch tier info")
      }
    } catch (err) {
      setError("Failed to fetch tier info")
      console.error("Error fetching tier info:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTierInfo()
  }, [user?.uid])

  const incrementDownload = async () => {
    if (!user?.uid) return

    try {
      const response = await fetch("/api/user/tracking/increment-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid }),
      })

      const result = await response.json()
      if (result.success) {
        setTierInfo(result.data)
      }
    } catch (err) {
      console.error("Error incrementing download:", err)
    }
  }

  const incrementBundle = async () => {
    if (!user?.uid) return

    try {
      const response = await fetch("/api/user/tracking/increment-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid }),
      })

      const result = await response.json()
      if (result.success) {
        setTierInfo(result.data)
      }
    } catch (err) {
      console.error("Error incrementing bundle:", err)
    }
  }

  return {
    tierInfo,
    loading,
    error,
    refetch: fetchTierInfo,
    incrementDownload,
    incrementBundle,
  }
}
