"use client"
import VimeoCard from "@/components/vimeo-card"
import { useVideosByCategory } from "@/hooks/use-catalog-videos"
import { Skeleton } from "@/components/ui/skeleton"

interface CatalogVideoGridProps {
  category: string
  title?: string
  limit?: number
}

export default function CatalogVideoGrid({ category, title, limit = 20 }: CatalogVideoGridProps) {
  const { videos, loading, error } = useVideosByCategory(category, limit)

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-500">Error loading videos: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {title && <h2 className="text-2xl font-bold">{title}</h2>}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[9/16] w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : videos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {videos.map((video) => (
            <div key={video.id}>
              <VimeoCard video={convertToVimeoVideo(video)} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-400">No videos found in this category.</p>
      )}
    </div>
  )
}

// Helper function to convert our catalog video format to the VimeoVideo format expected by VimeoCard
function convertToVimeoVideo(catalogVideo: any) {
  return {
    uri: `/videos/${catalogVideo.vimeoId}`,
    name: catalogVideo.title,
    description: catalogVideo.description,
    link: catalogVideo.vimeoLink,
    pictures: catalogVideo.vimeoData?.pictures || {
      sizes: [
        {
          width: 1280,
          height: 720,
          link: catalogVideo.thumbnail,
        },
      ],
    },
    // Add other required VimeoVideo properties
    ...catalogVideo.vimeoData,
  }
}
