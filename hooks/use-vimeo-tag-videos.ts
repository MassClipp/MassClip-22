"use client"

import { useState, useEffect } from "react"
import type { VimeoVideo } from "@/lib/types"

export function useVimeoTagVideos(showcaseId: string) {
  const [videos, setVideos] = useState<VimeoVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true)
      try {
        const url = `/api/vimeo/showcases/${showcaseId}/videos`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Failed to fetch videos for showcase ${showcaseId}`)
        }

        const data = await response.json()
        setVideos(data)
      } catch (err) {
        console.error("Error fetching videos:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }
    }

    if (showcaseId) {
      fetchVideos()
    }
  }, [showcaseId])

  return { videos, isLoading, error }
}
