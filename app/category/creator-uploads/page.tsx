"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useCreatorUploads } from "@/hooks/use-creator-uploads"
import { shuffleArray } from "@/lib/utils"
import EnhancedVideoCard from "@/components/enhanced-video-card"

// Inline VideoSkeleton component
function VideoSkeleton() {
  return (
    <div className="flex-shrink-0 w-[160px]">
      <div
        style={{
          position: "relative",
          paddingBottom: "177.78%", // 9:16 aspect ratio
          height: 0,
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#1f1f1f",
        }}
        className="animate-pulse"
      ></div>
      <div className="mt-2 h-4 bg-zinc-800 rounded animate-pulse"></div>
      <div className="mt-1 h-3 w-2/3 bg-zinc-800 rounded animate-pulse"></div>
    </div>
  )
}

// Detect content type for creator uploads
function detectCreatorUploadContentType(video: any): "video" | "audio" | "image" {
  const url = video.link || video.fileUrl || ""

  if (
    url.includes(".mp4") ||
    url.includes(".mov") ||
    url.includes(".avi") ||
    url.includes(".mkv") ||
    url.includes(".webm")
  ) {
    return "video"
  }
  if (url.includes(".mp3") || url.includes(".wav") || url.includes(".m4a") || url.includes(".aac")) {
    return "audio"
  }
  if (
    url.includes(".jpg") ||
    url.includes(".jpeg") ||
    url.includes(".png") ||
    url.includes(".gif") ||
    url.includes(".webp")
  ) {
    return "image"
  }

  // Default to video for backwards compatibility
  return "video"
}

export default function CreatorUploadsPage() {
  const router = useRouter()
  const { creatorUploads, loading: creatorUploadsLoading } = useCreatorUploads()
  const [visibleVideos, setVisibleVideos] = useState<any[]>([])

  // Filter and shuffle videos when data loads
  useEffect(() => {
    if (creatorUploads && creatorUploads.length > 0) {
      // Filter for video content only
      const filteredVideos = creatorUploads.filter((video) => {
        const contentType = detectCreatorUploadContentType(video)
        return contentType === "video"
      })

      // Shuffle and set all videos (no limit on this page)
      const shuffledVideos = shuffleArray([...filteredVideos], Math.random())
      setVisibleVideos(shuffledVideos)
    }
  }, [creatorUploads])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900/50 rounded-full p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-extralight tracking-wider text-white">Creator Uploads</h1>
            <p className="text-zinc-400 text-sm mt-1">{visibleVideos.length} videos available</p>
          </div>
        </div>

        {/* Content Grid */}
        {creatorUploadsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
            {Array.from({ length: 16 }).map((_, index) => (
              <VideoSkeleton key={index} />
            ))}
          </div>
        ) : visibleVideos.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4"
          >
            {visibleVideos.map((video, index) => (
              <motion.div key={video.uri || index} variants={itemVariants}>
                {/* Video card component would go here - using placeholder for now */}
                <EnhancedVideoCard
                  id={video.uri || video.id || index.toString()}
                  title={video.name || video.title || "Untitled"}
                  fileUrl={video.link || video.fileUrl || ""}
                  thumbnailUrl={video.thumbnailUrl}
                  fileSize={video.fileSize}
                  mimeType={video.mimeType || "video/mp4"}
                  aspectRatio="video"
                  showControls={true}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto mb-6 bg-zinc-900 rounded-full flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Creator Uploads Available</h3>
            <p className="text-zinc-500 text-sm">No video content has been uploaded by creators yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
