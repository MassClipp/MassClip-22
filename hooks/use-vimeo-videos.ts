"use client"

import { useState, useEffect } from "react"
import { useClips } from "@/hooks/use-clips"
import type { Clip } from "@/hooks/use-clips"

export function useVimeoVideos() {
  const [videos, setVideos] = useState<Clip[]>([])
  const [videosByTag, setVideosByTag] = useState<Record<string, Clip[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
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
      setVideos(clips)

      // Group videos by tag
      const tagMap: Record<string, Clip[]> = {}

      // Add "browse all" category
      tagMap["browse all"] = clips

      // Group by tags
      clips.forEach((clip) => {
        if (clip.tags) {
          clip.tags.forEach((tag) => {
            if (!tagMap[tag]) {
              tagMap[tag] = []
            }
            tagMap[tag].push(clip)
          })
        }
      })

      setVideosByTag(tagMap)
      setHasMore(false) // No pagination for now
      setLoading(false)
    } catch (err) {
      console.error("Error processing videos:", err)
      setError("Failed to process videos")
      setLoading(false)
    }
  }, [clipsLoading, clipsError, clips])

  const loadMore = () => {
    // No-op for now since we're not implementing pagination
    setHasMore(false)
  }

  return {
    videos,
    videosByTag,
    loading: loading || clipsLoading,
    error: error || clipsError,
    hasMore,
    loadMore,
  }
}
