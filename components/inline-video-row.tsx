"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, ArrowRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { shuffleArray } from "@/lib/utils"
import { useUserPlan } from "@/hooks/use-user-plan"
import { InlineVimeoCard } from "@/components/inline-vimeo-card"
import { InlineCreatorUploadCard } from "@/components/inline-creator-upload-card"

// Video Skeleton component
function VideoSkeleton() {
  return (
    <div className="flex-shrink-0 w-[160px]">
      <div
        style={{
          position: "relative",
          paddingBottom: "177.78%", // 9:16 aspect ratio
          overflow: "hidden",
          borderRadius: "12px",
          backgroundColor: "#18181b",
        }}
        className="animate-pulse"
      ></div>
      <div className="mt-2 px-1">
        <div className="h-3 bg-zinc-800 rounded animate-pulse mb-1"></div>
        <div className="h-2 bg-zinc-800 rounded animate-pulse w-2/3"></div>
      </div>
    </div>
  )
}

// Helper function to detect content type for creator uploads
function detectCreatorUploadContentType(video: any): string {
  // Check MIME type first
  if (video.mimeType) {
    if (video.mimeType.startsWith("video/")) return "video"
    if (video.mimeType.startsWith("image/")) return "image"
    if (video.mimeType.startsWith("audio/")) return "audio"
  }

  // Check file extension from URL
  const url = video.link || video.fileUrl || ""
  const extension = url.split(".").pop()?.toLowerCase()

  if (extension) {
    const videoExtensions = ["mp4", "mov", "avi", "mkv", "webm", "m4v"]
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"]
    const audioExtensions = ["mp3", "wav", "m4a", "aac", "ogg"]

    if (videoExtensions.includes(extension)) return "video"
    if (imageExtensions.includes(extension)) return "image"
    if (audioExtensions.includes(extension)) return "audio"
  }

  // Default to video if we can't determine
  return "video"
}

export function InlineVideoRow({
  title,
  videos,
  limit = 10,
  isShowcase = false,
  showcaseId,
  isCreatorUploads = false,
  onRefresh,
}: {
  title: string
  videos: any[]
  limit?: number
  isShowcase?: boolean
  showcaseId?: string
  isCreatorUploads?: boolean
  onRefresh?: () => void
}) {
  const [visibleVideos, setVisibleVideos] = useState<any[]>([])
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [maxScroll, setMaxScroll] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { isProUser } = useUserPlan()

  // Create a URL-friendly name
  const slug = encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))

  // Determine the correct link path based on whether this is a showcase or tag
  const linkPath = isShowcase && showcaseId ? `/showcase/${showcaseId}` : `/category/${slug}`

  // Determine button text based on category name
  const buttonText = title.toLowerCase() === "browse all" ? "Browse all" : "See all"

  // Handle manual refresh for creator uploads
  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return

    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Use Intersection Observer to load videos only when row is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }, // Load when within 200px of viewport
    )

    if (rowRef.current) {
      observer.observe(rowRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  // Load videos when row becomes visible
  useEffect(() => {
    if (isIntersecting && videos) {
      let filteredVideos = videos

      if (isCreatorUploads) {
        console.log(
          `[v0] Creator uploads before filtering:`,
          videos.map((v) => ({
            name: v.name || v.title,
            mimeType: v.mimeType,
            fileUrl: v.link || v.fileUrl,
            detectedType: detectCreatorUploadContentType(v),
          })),
        )

        filteredVideos = videos.filter((video) => {
          const contentType = detectCreatorUploadContentType(video)
          const isVideo = contentType === "video"

          console.log(`[v0] Filtering "${video.name || video.title}": type=${contentType}, isVideo=${isVideo}`)

          return isVideo
        })
        console.log(`[v0] Filtered creator uploads: ${videos.length} -> ${filteredVideos.length} (videos only)`)
      }

      // All users get shuffled videos for dynamic experience
      const shuffledVideos = shuffleArray([...filteredVideos], Math.random()).slice(0, limit)
      setVisibleVideos(shuffledVideos)
    }
  }, [isIntersecting, videos, limit, isCreatorUploads])

  // Calculate max scroll position
  useEffect(() => {
    const calculateMaxScroll = () => {
      if (scrollContainerRef.current) {
        const containerWidth = scrollContainerRef.current.clientWidth
        const scrollWidth = scrollContainerRef.current.scrollWidth
        setMaxScroll(Math.max(0, scrollWidth - containerWidth))
      }
    }

    calculateMaxScroll()
    window.addEventListener("resize", calculateMaxScroll)

    return () => {
      window.removeEventListener("resize", calculateMaxScroll)
    }
  }, [visibleVideos])

  // Handle scroll buttons
  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth
      const scrollAmount = containerWidth * 0.8

      const newPosition =
        direction === "left"
          ? Math.max(0, scrollPosition - scrollAmount)
          : Math.min(maxScroll, scrollPosition + scrollAmount)

      scrollContainerRef.current.scrollTo({
        left: newPosition,
        behavior: "smooth",
      })

      setScrollPosition(newPosition)
    }
  }

  // Update scroll position on manual scroll
  const handleManualScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft)
    }
  }

  if (!videos || videos.length === 0) {
    return null
  }

  const hasMore = videos.length > limit

  return (
    <section
      className="mb-12 category-section"
      ref={rowRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="px-6 mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-extralight tracking-wider text-white category-title group-hover:text-crimson transition-colors duration-300">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {/* Manual refresh button for creator uploads */}
          {isCreatorUploads && onRefresh && (
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={isRefreshing}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900/50 rounded-full px-3 py-1 transition-all duration-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          )}
          {hasMore && !isCreatorUploads && (
            <Link
              href={linkPath}
              className="text-zinc-400 hover:text-white flex items-center group bg-zinc-900/30 hover:bg-zinc-900/50 px-3 py-1 rounded-full transition-all duration-300"
            >
              <span className="mr-1 text-sm">{buttonText}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>
      <div className="relative">
        {/* Left scroll button */}
        {scrollPosition > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full h-8 w-8 shadow-lg"
              onClick={() => handleScroll("left")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {/* Right scroll button */}
        {scrollPosition < maxScroll && maxScroll > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full h-8 w-8 shadow-lg"
              onClick={() => handleScroll("right")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide gap-4 px-6 py-4"
          onScroll={handleManualScroll}
        >
          {isIntersecting
            ? visibleVideos.map((video, index) => {
                return (
                  <motion.div
                    key={video.uri || video.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="pt-1"
                  >
                    {isCreatorUploads ? (
                      <InlineCreatorUploadCard
                        video={{
                          id: video.uri?.split("/").pop() || video.id || "",
                          title: video.name || video.title || "Untitled",
                          fileUrl: video.link || video.fileUrl || "",
                          thumbnailUrl: video.pictures?.sizes?.[0]?.link || video.thumbnailUrl,
                          creatorName: video.user?.name || video.creatorName,
                          uid: video.user?.uri?.split("/").pop() || video.uid,
                          views: video.stats?.plays || video.views,
                        }}
                      />
                    ) : (
                      <InlineVimeoCard video={video} />
                    )}
                  </motion.div>
                )
              })
            : // Show skeleton loaders while waiting for intersection
              Array.from({ length: Math.min(limit, 10) }).map((_, index) => (
                <div key={index} className="pt-1">
                  <VideoSkeleton />
                </div>
              ))}
        </div>
      </div>
    </section>
  )
}
