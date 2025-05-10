"use client"

import { useState, useEffect } from "react"
import { useVideosByCategory } from "@/hooks/use-videos-by-category"
import VimeoCard from "@/components/vimeo-card"

interface CategoryVideoGridProps {
  category: string
  title?: string
  limit?: number
}

export default function CategoryVideoGrid({ category, title, limit = 12 }: CategoryVideoGridProps) {
  const { videos, loading, error } = useVideosByCategory(category)
  const [displayVideos, setDisplayVideos] = useState<any[]>([])

  useEffect(() => {
    if (!loading && videos.length > 0) {
      // Limit the number of videos to display
      setDisplayVideos(videos.slice(0, limit))
    }
  }, [videos, loading, limit])

  if (error) {
    return <div className="p-4 bg-red-500/10 rounded-lg text-red-500">Error loading videos: {error.message}</div>
  }

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-bold">{title}</h2>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: limit }).map((_, index) => (
              <div key={`skeleton-${index}`} className="aspect-[9/16] rounded-xl bg-zinc-900/50 animate-pulse"></div>
            ))
          : displayVideos.map((video) => (
              <div key={video.id} className="group">
                {/* Fetch the actual video data from Vimeo using the videoId */}
                <VimeoCard videoId={video.videoId} title={video.videoTitle} thumbnail={video.videoThumbnail} />
              </div>
            ))}

        {!loading && displayVideos.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-500">No videos found in this category.</div>
        )}
      </div>
    </div>
  )
}
