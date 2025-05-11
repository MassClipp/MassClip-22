"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { VimeoVideo } from "@/lib/types"
import { useUserPlan } from "@/hooks/use-user-plan"

export function useVimeoTagVideos(tag: string) {
  const [videos, setVideos] = useState<VimeoVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { isProUser } = useUserPlan()
  const FREE_USER_VIDEO_LIMIT = 5 // Limit for free users

  const isMounted = useRef(true)
  const allVideosRef = useRef<VimeoVideo[]>([])
  const normalizedTag = tag.toLowerCase().replace(/-/g, " ")

  const fetchVideos = useCallback(
    async (pageNum: number) => {
      try {
        setLoading(true)
        console.log(`Fetching videos for tag "${normalizedTag}", page ${pageNum}`)

        const response = await fetch(`/api/vimeo?tag=${encodeURIComponent(normalizedTag)}&page=${pageNum}&per_page=20`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || "Failed to fetch videos")
        }

        const data = await response.json()
        console.log(`Received ${data.data.length} videos for tag "${normalizedTag}"`)

        if (!isMounted.current) return

        // Store all videos in our ref
        allVideosRef.current = [...allVideosRef.current, ...data.data]

        // For free users, limit the number of videos
        const videosToShow = isProUser ? allVideosRef.current : allVideosRef.current.slice(0, FREE_USER_VIDEO_LIMIT)

        setVideos(videosToShow)
        setHasMore(!!data.paging?.next && (isProUser || allVideosRef.current.length < FREE_USER_VIDEO_LIMIT))
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
    },
    [normalizedTag, isProUser],
  )

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchVideos(nextPage)
    }
  }, [loading, hasMore, page, fetchVideos])

  useEffect(() => {
    // Reset state when tag changes
    setVideos([])
    setPage(1)
    setHasMore(true)
    setError(null)
    allVideosRef.current = []

    fetchVideos(1)

    return () => {
      isMounted.current = false
    }
  }, [normalizedTag, fetchVideos])

  return {
    videos,
    loading,
    error,
    hasMore,
    loadMore,
    isLimited: !isProUser && videos.length >= FREE_USER_VIDEO_LIMIT,
    totalVideos: allVideosRef.current.length,
  }
}
