"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthContext } from "@/contexts/auth-context"

interface Video {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl: string
  type: string
  duration: number
  size: number
  addedAt: Date
  uid: string
  creatorName?: string
  creatorUsername?: string
}

interface UseDiscoverContentReturn {
  videos: Video[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDiscoverContent(): UseDiscoverContentReturn {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthContext()

  const fetchDiscoverContent = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true)
        setError(null)

        console.log("🔍 [useDiscoverContent] Fetching all creators' free content", forceRefresh ? "(FORCED)" : "")

        // Add cache busting with timestamp
        const cacheBuster = Date.now()
        const url = `/api/discover/free-content?_t=${cacheBuster}`

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            ...(user?.uid && { Authorization: `Bearer ${user.uid}` }),
          },
          // Force no cache
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("🔍 [useDiscoverContent] API Response:", data)
        console.log("🔍 [useDiscoverContent] Fetch time:", data._fetchTime)

        if (data.success) {
          // Process videos with proper date handling
          const processedVideos = (data.videos || []).map((video: any) => ({
            ...video,
            addedAt: new Date(video.addedAt),
          }))

          setVideos(processedVideos)
          console.log(`✅ [useDiscoverContent] Loaded ${processedVideos.length} videos from all creators`)
          console.log(
            `📋 [useDiscoverContent] Video IDs:`,
            processedVideos.map((v) => v.id),
          )
        } else {
          setError(data.error || "Failed to fetch discover content")
          setVideos([])
        }
      } catch (err) {
        console.error("❌ [useDiscoverContent] Error:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch content")
        setVideos([])
      } finally {
        setLoading(false)
      }
    },
    [user],
  )

  useEffect(() => {
    fetchDiscoverContent()
  }, [fetchDiscoverContent])

  // Set up more aggressive periodic refresh to keep content in sync
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔄 [useDiscoverContent] Auto-refreshing content")
      fetchDiscoverContent(true) // Force refresh
    }, 15000) // Refresh every 15 seconds (more frequent)

    return () => clearInterval(interval)
  }, [fetchDiscoverContent])

  // Also refresh when the window gains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log("👁️ [useDiscoverContent] Window focused - refreshing content")
      fetchDiscoverContent(true)
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [fetchDiscoverContent])

  return {
    videos,
    loading,
    error,
    refetch: () => fetchDiscoverContent(true),
  }
}

// Export both names for compatibility
export const useCreatorUploads = useDiscoverContent
