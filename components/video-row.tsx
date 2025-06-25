"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronRight, ChevronLeft, ArrowRight } from "lucide-react"
import type { VimeoVideo } from "@/lib/types"
// Remove these imports:
// import VimeoCard from "@/components/vimeo-card"
// import CreatorUploadCard from "@/components/creator-upload-card"
import VideoSkeleton from "@/components/video-skeleton"
import { shuffleArray } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useUserPlan } from "@/hooks/use-user-plan"

interface VideoRowProps {
  title: string
  videos: VimeoVideo[]
  limit?: number
  isShowcase?: boolean
  showcaseId?: string
  isCreatorUploads?: boolean
}

export function VideoRow({
  title,
  videos,
  limit = 10,
  isShowcase = false,
  showcaseId,
  isCreatorUploads = false,
}: VideoRowProps) {
  const [visibleVideos, setVisibleVideos] = useState<VimeoVideo[]>([])
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [maxScroll, setMaxScroll] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { isProUser } = useUserPlan()

  // Add these state variables after the other useState declarations:
  const [VimeoCard, setVimeoCard] = useState<any>(null)
  const [CreatorUploadCard, setCreatorUploadCard] = useState<any>(null)

  // Create a URL-friendly name
  const slug = encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))

  // Determine the correct link path based on whether this is a showcase or tag
  const linkPath = isShowcase && showcaseId ? `/showcase/${showcaseId}` : `/category/${slug}`

  // Determine button text based on category name
  const buttonText = title.toLowerCase() === "browse all" ? "Browse all" : "See all"

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
      // All users get shuffled videos for dynamic experience
      const shuffledVideos = shuffleArray([...videos], Math.random()).slice(0, limit)
      setVisibleVideos(shuffledVideos)
    }
  }, [isIntersecting, videos, limit])

  // Add this useEffect after the existing useEffects:
  useEffect(() => {
    const loadComponents = async () => {
      try {
        const [vimeoCardModule, creatorUploadCardModule] = await Promise.all([
          import("@/components/vimeo-card"),
          import("@/components/creator-upload-card"),
        ])

        setVimeoCard(() => vimeoCardModule.default)
        setCreatorUploadCard(() => creatorUploadCardModule.default)
      } catch (error) {
        console.error("Error loading video card components:", error)
      }
    }

    loadComponents()
  }, [])

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
          className="flex overflow-x-auto scrollbar-hide gap-4 px-6 py-4" // Changed pb-4 to py-4 to add padding at the top
          onScroll={handleManualScroll}
        >
          {isIntersecting
            ? visibleVideos.map((video, index) => {
                return (
                  <motion.div
                    key={video.uri}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="pt-1"
                  >
                    {isCreatorUploads ? (
                      CreatorUploadCard ? (
                        <CreatorUploadCard
                          video={{
                            id: video.uri.split("/").pop() || "",
                            title: video.name || "Untitled",
                            fileUrl: video.link || "",
                            thumbnailUrl: video.pictures?.sizes?.[0]?.link,
                            creatorName: video.user?.name,
                            uid: video.user?.uri?.split("/").pop(),
                            views: video.stats?.plays,
                          }}
                        />
                      ) : (
                        <div className="aspect-[9/16] rounded-xl bg-zinc-900/50 animate-pulse"></div>
                      )
                    ) : VimeoCard ? (
                      <VimeoCard video={video} />
                    ) : (
                      <div className="aspect-[9/16] rounded-xl bg-zinc-900/50 animate-pulse"></div>
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

export default VideoRow
