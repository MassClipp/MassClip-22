"use client"

import { useState, useEffect, useCallback } from "react"

export function useCreatorUploads() {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCreatorUploads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 [useCreatorUploads] Fetching fresh creator uploads...")

      // Add cache-busting timestamp to ensure fresh data
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/creator-uploads?t=${timestamp}`, {
        cache: "no-store", // Disable caching
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ [useCreatorUploads] Fresh data received:", {
        videosCount: data.videos?.length || 0,
        timestamp: data.timestamp,
      })

      setVideos(data.videos || [])
    } catch (err) {
      console.error("❌ [useCreatorUploads] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch creator uploads")
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCreatorUploads()
  }, [fetchCreatorUploads])

  // Return refetch function for manual refresh
  return {
    videos,
    loading,
    error,
    refetch: fetchCreatorUploads,
  }
}
