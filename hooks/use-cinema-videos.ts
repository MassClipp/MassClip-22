"use client"

import { useState, useEffect } from "react"

interface Video {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  url: string
  views: number
  downloads: number
  createdAt: Date
  tags: string[]
}

export function useCinemaVideos() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchCinemaVideos() {
      try {
        setLoading(true)
        const response = await fetch("/api/vimeo/showcases/cinema/videos")

        if (!response.ok) {
          throw new Error(`Failed to fetch cinema videos: ${response.status}`)
        }

        const data = await response.json()
        setVideos(data.videos || [])
      } catch (err) {
        console.error("Error fetching cinema videos:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchCinemaVideos()
  }, [])

  return { videos, loading, error }
}
