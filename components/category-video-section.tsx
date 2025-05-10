"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getVideosByCategory } from "@/lib/video-catalog-manager"
import type { Video } from "@/lib/types"
import { VimeoCard } from "./vimeo-card"

interface CategoryVideoSectionProps {
  category: string
  title: string
  limit?: number
}

export default function CategoryVideoSection({ category, title, limit = 6 }: CategoryVideoSectionProps) {
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true)
      try {
        const fetchedVideos = await getVideosByCategory(category)
        setVideos(fetchedVideos.slice(0, limit))
      } catch (error) {
        console.error(`Error fetching videos for category ${category}:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVideos()
  }, [category, limit])

  if (isLoading) {
    return (
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-white">{title}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array(limit)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-md aspect-video animate-pulse"></div>
            ))}
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return null // Don't show empty categories
  }

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium text-white">{title}</h2>
        <Link
          href={`/category/${category}`}
          className="text-sm text-crimson hover:text-crimson/80 flex items-center gap-1"
        >
          View All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {videos.map((video) => (
          <VimeoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  )
}
