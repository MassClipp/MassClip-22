"use client"

import { useState, useEffect } from "react"

interface VimeoVideo {
  id: string
  title: string
  description?: string
  thumbnailUrl: string
  videoUrl: string
  downloadUrl?: string
  tags?: string[]
  uri: string
  name: string
}

export function useVimeoTagVideos(tag: string) {
  const [videos, setVideos] = useState<VimeoVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true)

        // Fetch from our new API endpoint instead of Vimeo
        const response = await fetch(`/api/videos/tag/${encodeURIComponent(tag)}?page=${page}`)

        if (!response.ok) {
          throw new Error("Failed to fetch videos for tag")
        }

        const data = await response.json()

        // Transform the data to match the expected format
        const transformedVideos: VimeoVideo[] = data.videos.map((video: any) => ({
          ...video,
          uri: `/videos/${video.id}`,
          name: video.title,
        }))

        setVideos((prev) => (page === 1 ? transformedVideos : [...prev, ...transformedVideos]))
        setHasMore(data.hasMore || false)
      } catch (err) {
        console.error(`Error fetching videos for tag ${tag}:`, err)
        setError(err instanceof Error ? err.message : "Failed to fetch videos")
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [tag, page])

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1)
    }
  }

  return {
    videos,
    loading,
    error,
    hasMore,
    loadMore,
  }
}
