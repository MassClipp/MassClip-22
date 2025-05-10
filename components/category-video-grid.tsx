"use client"

import { useState, useEffect } from "react"
import { VimeoCard } from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"
import { getVideosByCategory } from "@/lib/category-manager"

interface CategoryVideoGridProps {
  category: string
  showcaseId?: string
  limit?: number
}

export default function CategoryVideoGrid({ category, showcaseId, limit = 24 }: CategoryVideoGridProps) {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true)

        // Fetch videos from both Firestore and Vimeo showcases with fallback logic
        const results = await getVideosByCategory(category, showcaseId)

        // Limit the number of videos if needed
        const limitedResults = limit ? results.slice(0, limit) : results

        setVideos(limitedResults)
      } catch (err) {
        console.error("Error fetching category videos:", err)
        setError("Failed to load videos")
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [category, showcaseId, limit])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <VideoSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (videos.length === 0) {
    return <div className="text-center py-8">No videos found in this category.</div>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {videos.map((video) => {
        // Handle both Firestore video objects and Vimeo API response objects
        if (video.videoData) {
          // This is a Firestore video with embedded Vimeo data
          return <VimeoCard key={video.videoId} video={video.videoData} />
        } else if (video.uri) {
          // This is a direct Vimeo API response
          return <VimeoCard key={video.uri} video={video} />
        } else {
          // Skip invalid videos
          return null
        }
      })}
    </div>
  )
}
