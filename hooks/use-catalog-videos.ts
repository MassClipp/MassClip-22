"use client"

import { useState, useEffect } from "react"
import { getVideosByCategory, getRecentVideos, getVideoById } from "@/lib/video-catalog-manager"

/**
 * Hook to fetch videos by category from our catalog
 */
export function useVideosByCategory(category: string, limit = 20) {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true)
        const result = await getVideosByCategory(category, limit)
        setVideos(result)
      } catch (err) {
        console.error("Error fetching videos by category:", err)
        setError(err instanceof Error ? err : new Error("Failed to fetch videos"))
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [category, limit])

  return { videos, loading, error }
}

/**
 * Hook to fetch recent videos from our catalog
 */
export function useRecentVideos(limit = 20) {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true)
        const result = await getRecentVideos(limit)
        setVideos(result)
      } catch (err) {
        console.error("Error fetching recent videos:", err)
        setError(err instanceof Error ? err : new Error("Failed to fetch videos"))
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [limit])

  return { videos, loading, error }
}

/**
 * Hook to fetch a single video by ID
 */
export function useVideoById(videoId: string | null) {
  const [video, setVideo] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchVideo() {
      if (!videoId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const result = await getVideoById(videoId)
        setVideo(result)
      } catch (err) {
        console.error("Error fetching video by ID:", err)
        setError(err instanceof Error ? err : new Error("Failed to fetch video"))
      } finally {
        setLoading(false)
      }
    }

    fetchVideo()
  }, [videoId])

  return { video, loading, error }
}
