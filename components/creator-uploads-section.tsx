"use client"

import { useDiscoverContent } from "@/hooks/use-creator-uploads"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import CreatorUploadCard from "@/components/creator-upload-card"

export function CreatorUploadsSection() {
  const { videos, loading, error } = useDiscoverContent()
  const router = useRouter()

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Discover Free Content</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    console.error("Discover content error:", error)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Discover Free Content</h2>
      <p className="text-sm text-muted-foreground">Explore free content from all creators</p>
      {videos.length === 0 ? (
        <p className="text-muted-foreground">No free content available for discovery</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <div key={video.id} className="space-y-2">
              <CreatorUploadCard
                video={{
                  id: video.id,
                  title: video.title,
                  fileUrl: video.fileUrl,
                  thumbnailUrl: video.thumbnailUrl,
                  creatorName: video.creatorName,
                  uid: video.uid,
                  views: video.views,
                  downloads: video.downloads,
                  username: video.creatorUsername,
                  userDisplayName: video.creatorName,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
