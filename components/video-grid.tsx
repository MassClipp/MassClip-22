"use client"

import { VimeoCard } from "./vimeo-card"
import { PremiumVideoCard } from "./premium-video-card"

interface Video {
  id: string
  title: string
  description?: string
  thumbnail?: string
  duration?: number
  isPremium?: boolean
  price?: number
  creatorId?: string
  [key: string]: any
}

interface VideoGridProps {
  videos: Video[]
  showPremiumBadge?: boolean
}

export default function VideoGrid({ videos, showPremiumBadge = true }: VideoGridProps) {
  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No videos available</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {videos.map((video) => {
        if (video.isPremium && showPremiumBadge) {
          return <PremiumVideoCard key={video.id} video={video} price={video.price} />
        }

        return <VimeoCard key={video.id} video={video} />
      })}
    </div>
  )
}
