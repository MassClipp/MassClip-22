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

  const fetchDiscoverContent = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [useDiscoverContent] Fetching all creators' free content")

      const response = await fetch(`/api/discover/free-content`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          ...(user?.uid && { Authorization: `Bearer ${user.uid}` }),
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("🔍 [useDiscoverContent] API Response:", data)

      if (data.success) {
        const processedVideos = (data.videos || []).map((video: any) => ({
          ...video,
          addedAt: new Date(video.addedAt),
        }))

        setVideos(processedVideos)
        console.log(`✅ [useDiscoverContent] Loaded ${processedVideos.length} videos from all creators`)
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
  }, [user])

  useEffect(() => {
    fetchDiscoverContent()
  }, [fetchDiscoverContent])

  return {
    videos,
    loading,
    error,
    refetch: fetchDiscoverContent,
  }
}

// Export both names for compatibility
export const useCreatorUploads = useDiscoverContent
