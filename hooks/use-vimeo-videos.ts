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

export function useVimeoVideos() {
  const [videos, setVideos] = useState<VimeoVideo[]>([])
  const [videosByTag, setVideosByTag] = useState<Record<string, VimeoVideo[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true)

        // Fetch from our new API endpoint instead of Vimeo
        const response = await fetch(`/api/videos?page=${page}`)

        if (!response.ok) {
          throw new Error("Failed to fetch videos")
        }

        const data = await response.json()

        // Transform the data to match the expected format
        const transformedVideos: VimeoVideo[] = data.videos.map((video: any) => ({
          ...video,
          uri: `/videos/${video.id}`,
          name: video.title,
        }))

        setVideos((prev) => [...prev, ...transformedVideos])

        // Group videos by tag
        const tagMap: Record<string, VimeoVideo[]> = {}

        // Add "browse all" category
        tagMap["browse all"] = transformedVideos

        transformedVideos.forEach((video) => {
          if (video.tags) {
            video.tags.forEach((tag) => {
              if (!tagMap[tag]) {
                tagMap[tag] = []
              }
              tagMap[tag].push(video)
            })
          }
        })

        setVideosByTag(tagMap)
        setHasMore(data.hasMore || false)
      } catch (err) {
        console.error("Error fetching videos:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch videos")
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [page])

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1)
    }
  }

  return {
    videos,
    videosByTag,
    loading,
    error,
    hasMore,
    loadMore,
  }
}
