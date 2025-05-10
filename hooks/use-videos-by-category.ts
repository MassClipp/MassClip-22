"use client"

import { useState, useEffect } from "react"
import { getVideosByCategory, getAllVideosByCategory } from "@/lib/category-manager"

/**
 * Hook to fetch videos for a specific category
 */
export function useVideosByCategory(category: string) {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true)
        const categoryVideos = await getVideosByCategory(category)
        setVideos(categoryVideos)
        setError(null)
      } catch (err) {
        console.error(`Error fetching videos for category ${category}:`, err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [category])

  return { videos, loading, error }
}

/**
 * Hook to fetch all videos grouped by category
 */
export function useAllVideosByCategory() {
  const [videosByCategory, setVideosByCategory] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchAllVideos() {
      try {
        setLoading(true)
        const allVideosByCategory = await getAllVideosByCategory()
        setVideosByCategory(allVideosByCategory)
        setError(null)
      } catch (err) {
        console.error("Error fetching all videos by category:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchAllVideos()
  }, [])

  return { videosByCategory, loading, error }
}
