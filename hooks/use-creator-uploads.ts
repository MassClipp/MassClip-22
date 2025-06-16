"use client"

import { useState, useEffect } from "react"
import { useAuthContext } from "@/contexts/auth-context"
import { useQueryClient } from "@tanstack/react-query"

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
  const queryClient = useQueryClient()

  const fetchDiscoverContent = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [useDiscoverContent] Fetching all creators' free content")

      const response = await fetch(`/api/discover/free-content`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(user?.uid && { Authorization: `Bearer ${user.uid}` }),
          // Add cache-busting header to ensure fresh data
          "Cache-Control": "no-cache",
        },
      })

      const data = await response.json()

      if (data.success) {
        setVideos(data.videos || [])
        console.log(`✅ [useDiscoverContent] Loaded ${data.videos?.length || 0} videos from all creators`)
      } else {
        setError(data.error || "Failed to fetch discover content")
        setVideos([])
      }
    } catch (err) {
      console.error("❌ [useDiscoverContent] Error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDiscoverContent()
  }, [])

  // Listen for creator uploads updates
  useEffect(() => {
    const handleCreatorUploadsUpdate = () => {
      console.log("🔄 [useDiscoverContent] Received creator uploads update event, refetching...")
      fetchDiscoverContent()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("creatorUploadsUpdated", handleCreatorUploadsUpdate)

      return () => {
        window.removeEventListener("creatorUploadsUpdated", handleCreatorUploadsUpdate)
      }
    }
  }, [])

  return {
    videos,
    loading,
    error,
    refetch: fetchDiscoverContent,
  }
}

// Export both names for compatibility
export const useCreatorUploads = useDiscoverContent
