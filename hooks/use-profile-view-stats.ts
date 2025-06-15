"use client"

import { useState, useEffect } from "react"

interface ProfileViewStats {
  totalViews: number
  todayViews: number
  lastView: string | null
  totalAnalytics: number
  actualRecordCount?: number
}

export function useProfileViewStats(userId: string) {
  const [stats, setStats] = useState<ProfileViewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [useProfileViewStats] Fetching stats for userId: ${userId}`)

      const response = await fetch(`/api/profile-view-stats?userId=${userId}`)
      const data = await response.json()

      console.log(`📊 [useProfileViewStats] API response:`, data)

      if (data.success) {
        setStats(data.stats)
      } else {
        setError(data.error || "Failed to fetch stats")
      }
    } catch (err) {
      setError("Network error while fetching stats")
      console.error("❌ [useProfileViewStats] Error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [userId])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}
