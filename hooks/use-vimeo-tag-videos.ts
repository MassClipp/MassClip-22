"use client"

import { useState, useEffect } from "react"
import { useClips } from "@/hooks/use-clips"
import type { Clip } from "@/hooks/use-clips"

export function useVimeoTagVideos(tag: string) {
  const [videos, setVideos] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Use our new clips hook
  const { clips, loading: clipsLoading, error: clipsError } = useClips()

  useEffect(() => {
    if (clipsLoading) {
      setLoading(true)
      return
    }

    if (clipsError) {
      setError(clipsError)
      setLoading(false)
      return
    }

    try {
      // Filter clips by tag
      const normalizedTag = tag.toLowerCase().trim()

      // Special case for "browse all"
      if (normalizedTag === "browse all" || normalizedTag === "browse-all") {
        setVideos(clips)
      } else {
        // Filter by tag or category
        const filteredClips = clips.filter(
          (clip) =>
            clip.category?.toLowerCase() === normalizedTag || clip.tags?.some((t) => t.toLowerCase() === normalizedTag),
        )

        setVideos(filteredClips)
      }

      setHasMore(false) // No pagination for now
      setLoading(false)
    } catch (err) {
      console.error(`Error processing videos for tag ${tag}:`, err)
      setError("Failed to process videos for this tag")
      setLoading(false)
    }
  }, [clipsLoading, clipsError, clips, tag])

  const loadMore = () => {
    // No-op for now since we're not implementing pagination
    setHasMore(false)
  }

  return {
    videos,
    loading: loading || clipsLoading,
    error: error || clipsError,
    hasMore,
    loadMore,
  }
}
