"use client"

import { useState, useEffect } from "react"
import { vimeoConfig } from "@/lib/vimeo-config"

interface VimeoVideo {
  uri: string
  name: string
  description: string
  link: string
  duration: number
  width: number
  height: number
  created_time: string
  modified_time: string
  pictures: {
    uri: string
    active: boolean
    type: string
    base_link: string
    sizes: Array<{
      width: number
      height: number
      link: string
      link_with_play_button: string
    }>
  }
  stats: {
    plays: number
  }
  tags: Array<{
    uri: string
    name: string
    tag: string
  }>
  user: {
    uri: string
    name: string
    link: string
    pictures: {
      uri: string
      active: boolean
      type: string
      sizes: Array<{
        width: number
        height: number
        link: string
      }>
    }
  }
}

interface UseVimeoNicheVideosResult {
  videos: VimeoVideo[]
  loading: boolean
  error: Error | null
  totalCount: number
  hasMore: boolean
  loadMore: () => void
}

export function useVimeoNicheVideos(niche: string, perPage = 20): UseVimeoNicheVideosResult {
  const [videos, setVideos] = useState<VimeoVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    // Reset state when niche changes
    setVideos([])
    setPage(1)
    setLoading(true)
    setError(null)
  }, [niche])

  useEffect(() => {
    if (!niche) {
      setLoading(false)
      return
    }

    const fetchVideos = async () => {
      try {
        setLoading(true)

        // Fetch videos with the specified niche tag
        const response = await fetch(
          `https://api.vimeo.com/me/videos?per_page=${perPage}&page=${page}&query=${encodeURIComponent(niche)}&fields=uri,name,description,link,duration,width,height,created_time,modified_time,pictures,stats,tags,user`,
          {
            headers: {
              Authorization: `Bearer ${vimeoConfig.accessToken}`,
              "Content-Type": "application/json",
              Accept: "application/vnd.vimeo.*+json;version=3.4",
            },
          },
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch videos: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // Filter videos to only include those with the exact niche tag
        const filteredVideos = data.data.filter(
          (video: VimeoVideo) => video.tags && video.tags.some((tag) => tag.name.toLowerCase() === niche.toLowerCase()),
        )

        setVideos((prev) => (page === 1 ? filteredVideos : [...prev, ...filteredVideos]))
        setTotalCount(data.total)
        setHasMore(data.paging && data.paging.next)
        setLoading(false)
      } catch (err) {
        console.error("Error fetching videos by niche:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      }
    }

    fetchVideos()
  }, [niche, page, perPage])

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1)
    }
  }

  return { videos, loading, error, totalCount, hasMore, loadMore }
}
