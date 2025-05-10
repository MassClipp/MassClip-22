import { useVideosByCategory } from "@/hooks/use-videos-by-category"
import { VimeoCard } from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"

interface CategoryVideoGridProps {
  categoryId: string
  limit?: number
  title?: string
  className?: string
}

export default function CategoryVideoGrid({ categoryId, limit = 24, title, className = "" }: CategoryVideoGridProps) {
  const { videos, loading, error } = useVideosByCategory(categoryId, limit)

  if (loading) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 ${className}`}>
        {Array.from({ length: Math.min(limit, 12) }).map((_, index) => (
          <VideoSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="p-4 bg-red-500/10 rounded-lg text-red-500">Error loading videos: {error.message}</div>
  }

  if (videos.length === 0) {
    return <div className="text-center py-8 text-zinc-500">No videos found in this category.</div>
  }

  return (
    <div className={className}>
      {title && <h2 className="text-2xl font-bold mb-4">{title}</h2>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {videos.map((video) => {
          // Handle different video data structures
          if (video.vimeoData) {
            // This is from our catalog with embedded Vimeo data
            return <VimeoCard key={video.id} video={video.vimeoData} />
          } else if (video.uri) {
            // This is a direct Vimeo API response
            return <VimeoCard key={video.id} video={video} />
          } else if (video.vimeoId) {
            // This is from our uploads collection
            return (
              <VimeoCard
                key={video.id}
                video={{
                  uri: `/videos/${video.vimeoId}`,
                  name: video.title,
                  description: video.description,
                  link: video.vimeoLink,
                  // Add other required properties for VimeoVideo
                  pictures: {
                    sizes: [
                      {
                        width: 1280,
                        height: 720,
                        link: `https://vumbnail.com/${video.vimeoId}.jpg`,
                      },
                    ],
                  },
                }}
              />
            )
          }

          // Skip invalid videos
          return null
        })}
      </div>
    </div>
  )
}
