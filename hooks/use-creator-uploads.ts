"use client"

import { useState, useEffect } from "react"
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
}

interface UseCreatorUploadsReturn {
  videos: Video[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useCreatorUploads(): UseCreatorUploadsReturn {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthContext()

  const fetchCreatorUploads = async () => {
    if (!user?.uid) {
      setVideos([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [useCreatorUploads] Fetching for user:", user.uid)

      const response = await fetch(`/api/creator-uploads?userId=${user.uid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.uid}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setVideos(data.videos || [])
        console.log(`✅ [useCreatorUploads] Loaded ${data.videos?.length || 0} videos`)
      } else {
        setError(data.error || "Failed to fetch creator uploads")
        setVideos([])
      }
    } catch (err) {
      console.error("❌ [useCreatorUploads] Error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCreatorUploads()
  }, [user?.uid])

  return {
    videos,
    loading,
    error,
    refetch: fetchCreatorUploads,
  }
}
