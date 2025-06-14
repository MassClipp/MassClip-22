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

      console.log("🔍 [useCreatorUploads] Fetching uploads for current user:", user.uid)

      // Get the Firebase Auth token for proper authentication
      const token = await user.getIdToken()

      const response = await fetch(`/api/creator/uploads`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        // Only show uploads from the current user
        const userUploads = (data.uploads || []).filter((upload: any) => upload.uid === user.uid)
        setVideos(userUploads)
        console.log(`✅ [useCreatorUploads] Loaded ${userUploads.length} uploads for user ${user.uid}`)
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
