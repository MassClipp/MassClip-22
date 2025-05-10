"use client"

/**
 * React hook for fetching videos by category
 */

import { useState, useEffect } from "react"
import { getVideosForCategory } from "@/lib/category-system/category-db"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

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

        // Get video IDs for this category
        const videoIds = await getVideosForCategory(categoryId, limit)

        if (videoIds.length === 0) {
          setVideos([])
          setLoading(false)
          return
        }

        // Fetch each video's data from Firestore
        const videoPromises = videoIds.map(async (videoId) => {
          // Try to get from videos collection first
          const videoRef = doc(db, "videos", videoId)
          const videoDoc = await getDoc(videoRef)

          if (videoDoc.exists()) {
            return {
              id: videoDoc.id,
              ...videoDoc.data(),
            }
          }

          // If not found, try uploads collection
          const uploadRef = doc(db, "uploads", videoId)
          const uploadDoc = await getDoc(uploadRef)

          if (uploadDoc.exists()) {
            return {
              id: uploadDoc.id,
              ...uploadDoc.data(),
            }
          }

          // If still not found, return a minimal object
          return {
            id: videoId,
            videoId: videoId,
            title: "Unknown Video",
            description: "Video details not found",
          }
        })

        const videoData = await Promise.all(videoPromises)
        setVideos(videoData)
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

        // Try to get from videos collection first
        const videoRef = doc(db, "videos", videoId)
        const videoDoc = await getDoc(videoRef)

        if (videoDoc.exists()) {
          setVideo({
            id: videoDoc.id,
            ...videoDoc.data(),
          })
          setLoading(false)
          return
        }

        // If not found, try uploads collection
        const uploadRef = doc(db, "uploads", videoId)
        const uploadDoc = await getDoc(uploadRef)

        if (uploadDoc.exists()) {
          setVideo({
            id: uploadDoc.id,
            ...uploadDoc.data(),
          })
          setLoading(false)
          return
        }

        // If still not found, set video to null
        setVideo(null)
        setError(new Error(`Video ${videoId} not found`))
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
