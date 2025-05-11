"use client"

import { useState, useEffect } from "react"
import { getShowcaseIdForCategory } from "@/lib/showcase-category-mapping"
import { fetchVimeoShowcaseVideos } from "@/lib/vimeo-helpers"

// Hook for fetching videos by category
export function useVideosByCategory(categoryId: string, limit = 24) {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchVideos() {
      if (!categoryId) {
        setVideos([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Get the showcase ID for this category
        const showcaseId = getShowcaseIdForCategory(categoryId)

        if (!showcaseId) {
          setVideos([])
          setLoading(false)
          return
        }

        // Fetch videos from the showcase
        const showcaseVideos = await fetchVimeoShowcaseVideos(showcaseId)

        // Limit the number of videos if needed
        const limitedVideos = showcaseVideos.slice(0, limit)

        setVideos(limitedVideos)
        setError(null)
      } catch (err) {
        console.error(`Error fetching videos for category ${categoryId}:`, err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [categoryId, limit])

  return { videos, loading, error }
}

// Hook for fetching a single video with its categories
export function useVideoWithCategories(videoId: string) {
  const [video, setVideo] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchVideo() {
      if (!videoId) {
        setVideo(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Fetch the video from Vimeo API
        const response = await fetch(`/api/vimeo/video-status/${videoId}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.statusText}`)
        }

        const videoData = await response.json()

        setVideo(videoData)
        setError(null)
      } catch (err) {
        console.error(`Error fetching video ${videoId}:`, err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchVideo()
  }, [videoId])

  return { video, loading, error }
}
