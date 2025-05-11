"use client"

import { useState, useEffect, useRef } from "react"
import type { Video } from "@/lib/types"

export function useTagVideos(tag: string) {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const isMounted = useRef(true)
  const perPage = 20

  // Helper function to normalize tag names
  const normalizeTagName = (tagName: string): string => {
    return tagName.trim().toLowerCase().replace(/\s+/g, " ")
  }

  const fetchVideosByTag = async (pageNum: number) => {
    try {
      setLoading(true)
      console.log(`Fetching videos for tag ${tag}, page ${pageNum}, ${perPage} per page`)

      // Replace with your actual API endpoint for fetching videos by tag from Cloudflare R2
      const response = await fetch(`/api/videos/tag/${encodeURIComponent(tag)}?page=${pageNum}&per_page=${perPage}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to fetch videos")
      }

      const data = await response.json()
      console.log(`Received ${data.videos.length} videos from API`)

      // Only update state if component is still mounted
      if (!isMounted.current) return

      // Update videos
      setVideos((prev) => [...prev, ...data.videos])

      // Check if there are more videos to load
      setHasMore(data.hasMore)
    } catch (err) {
      console.error("Error fetching videos:", err)
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch videos")
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchVideosByTag(nextPage)
    }
  }

  useEffect(() => {
    // Reset state when tag changes
    setVideos([])
    setError(null)
    setLoading(true)
    setPage(1)
    setHasMore(true)

    // Fetch videos for the new tag
    fetchVideosByTag(1)

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [tag]) // Re-run when tag changes

  return {
    videos,
    loading,
    error,
    hasMore,
    loadMore,
  }
}
