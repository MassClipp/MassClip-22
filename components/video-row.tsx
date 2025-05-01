"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronRight, ChevronLeft } from "lucide-react"
import type { VimeoVideo } from "@/lib/types"
import VimeoCard from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"
import { shuffleArray } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface VideoRowProps {
  title: string
  videos: VimeoVideo[]
  limit?: number
  isShowcase?: boolean
  showcaseId?: string
}

export default function VideoRow({ title, videos, limit = 6, isShowcase = false, showcaseId }: VideoRowProps) {
  const [visibleVideos, setVisibleVideos] = useState<VimeoVideo[]>([])
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [maxScroll, setMaxScroll] = useState(0)
  const rowRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
      // Create a more thorough shuffle to ensure variety
      const shuffledVideos = shuffleArray([...videos])

      // Take a different slice each time based on a random starting point
      // This ensures we get different videos even if the array is the same
      const randomStart = Math.floor(Math.random() * Math.max(1, videos.length - limit))
      const selectedVideos = shuffledVideos.slice(randomStart, randomStart + limit)

      // If we don't have enough videos from the random start, wrap around to the beginning
      if (selectedVideos.length < limit && videos.length > limit) {
        const remaining = limit - selectedVideos.length
        selectedVideos.push(...shuffledVideos.slice(0, remaining))
      }

      setVisibleVideos(selectedVideos)
    }
  }, [isIntersecting, videos, limit])

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
    <section className="mb-12 category-section" ref={rowRef}>
      <div className="px-6 mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-extralight tracking-wider text-white category-title">{title}</h2>
        {hasMore && (
          <Link href={linkPath} className="text-zinc-400 hover:text-white flex items-center group">
            <span className="mr-1">{buttonText}</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      <div className="relative">
        {/* Left scroll button */}
        {scrollPosition > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full h-8 w-8"
            onClick={() => handleScroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Right scroll button */}
        {scrollPosition < maxScroll && maxScroll > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full h-8 w-8"
            onClick={() => handleScroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide gap-4 px-6 pb-4"
          onScroll={handleManualScroll}
        >
          {isIntersecting
            ? visibleVideos.map((video) => (
                <motion.div
                  key={video.uri}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <VimeoCard video={video} />
                </motion.div>
              ))
            : // Show skeleton loaders while waiting for intersection
              Array.from({ length: Math.min(limit, 6) }).map((_, index) => <VideoSkeleton key={index} />)}
        </div>
      </div>
    </section>
  )
}
