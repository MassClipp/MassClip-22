"use client"

import { useCreatorUploads } from "@/hooks/use-creator-uploads"
import { VideoCard } from "@/components/video-card"
import { Skeleton } from "@/components/ui/skeleton"

export function CreatorUploadsSection() {
  const { videos, loading, error } = useCreatorUploads()

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Creator Uploads</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    console.error("Creator uploads error:", error)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Creator Uploads</h2>
      {videos.length === 0 ? (
        <p className="text-muted-foreground">No creator uploads found. Found {videos.length} videos</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id}
              title={video.title}
              thumbnailUrl={video.thumbnailUrl}
              fileUrl={video.fileUrl}
              duration={video.duration}
              type={video.type}
            />
          ))}
        </div>
      )}
    </div>
  )
}
