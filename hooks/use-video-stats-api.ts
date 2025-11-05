"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

interface VideoStats {
  totalUploads: number
  totalFreeVideos: number
  freeVideoPercentage: number
  recentUploads: any[]
  recentFreeVideos: any[]
  loading: boolean
  error: string | null
}

export function useVideoStatsAPI() {
  const { user } = useAuth()
  const [stats, setStats] = useState<VideoStats>({
    totalUploads: 0,
    totalFreeVideos: 0,
    freeVideoPercentage: 0,
    recentUploads: [],
    recentFreeVideos: [],
    loading: true,
    error: null,
  })

  const fetchVideoStats = useCallback(async () => {
    if (!user) {
      setStats((prev) => ({ ...prev, loading: false }))
      return
    }

    try {
      setStats((prev) => ({ ...prev, loading: true, error: null }))

      // Get auth token
      const token = await user.getIdToken()

      // Fetch uploads
      const uploadsResponse = await fetch("/api/uploads", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!uploadsResponse.ok) {
        throw new Error("Failed to fetch uploads")
      }

      const uploadsData = await uploadsResponse.json()
      const uploads = uploadsData.uploads || []

      // Fetch free content
      const freeContentResponse = await fetch("/api/free-content", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      let freeContent = []
      if (freeContentResponse.ok) {
        const freeContentData = await freeContentResponse.json()
        freeContent = freeContentData.freeContent || []
      }

      const totalUploads = uploads.length
      const totalFreeVideos = freeContent.length
      const freeVideoPercentage = totalUploads > 0 ? (totalFreeVideos / totalUploads) * 100 : 0

      // Sort by date (newest first)
      const sortedUploads = uploads.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.uploadedAt || 0).getTime()
        const dateB = new Date(b.createdAt || b.uploadedAt || 0).getTime()
        return dateB - dateA
      })

      const sortedFreeContent = freeContent.sort((a, b) => {
        const dateA = new Date(a.addedAt || a.createdAt || 0).getTime()
        const dateB = new Date(b.addedAt || b.createdAt || 0).getTime()
        return dateB - dateA
      })

      setStats({
        totalUploads,
        totalFreeVideos,
        freeVideoPercentage,
        recentUploads: sortedUploads.slice(0, 5),
        recentFreeVideos: sortedFreeContent.slice(0, 5),
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error("Error fetching video stats:", error)
      setStats((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch video statistics",
      }))
    }
  }, [user])

  useEffect(() => {
    fetchVideoStats()
  }, [fetchVideoStats])

  // Refetch every 30 seconds for near real-time updates
  useEffect(() => {
    const interval = setInterval(fetchVideoStats, 30000)
    return () => clearInterval(interval)
  }, [fetchVideoStats])

  return {
    ...stats,
    refetch: fetchVideoStats,
  }
}
