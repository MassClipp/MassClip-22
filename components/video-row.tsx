"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import VimeoCard from "./vimeo-card"

interface VideoRowProps {
  title: string
  videos: any[]
  limit?: number
  isShowcase?: boolean
  showcaseId?: string
}

export default function VideoRow({ title, videos = [], limit = 10, isShowcase = false, showcaseId }: VideoRowProps) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [maxScroll, setMaxScroll] = useState(0)
  const [visibleVideos, setVisibleVideos] = useState<any[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Calculate how many videos to show based on screen size
  useEffect(() => {
    if (videos.length > 0) {
      // Limit the number of videos to display
      setVisibleVideos(videos.slice(0, limit))
    }
  }, [videos, limit])

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
    return () => window.removeEventListener("resize", calculateMaxScroll)
  }, [visibleVideos])

  // Handle scroll buttons
  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth
      const newPosition =
        direction === "left"
          ? Math.max(0, scrollPosition - containerWidth / 2)
          : Math.min(maxScroll, scrollPosition + containerWidth / 2)

      scrollContainerRef.current.scrollTo({
        left: newPosition,
        behavior: "smooth",
      })

      setScrollPosition(newPosition)
    }
  }

  // Update scroll position when scrolling manually
  const handleScrollEvent = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft)
    }
  }

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScrollEvent)
      return () => scrollContainer.removeEventListener("scroll", handleScrollEvent)
    }
  }, [])

  // If no videos, don't render anything
  if (visibleVideos.length === 0) {
    return null
  }

  return (
    <div className="px-6 mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-light text-white">{title}</h2>
        {isShowcase && showcaseId && (
          <Link
            href={`/showcase/${showcaseId}`}
            className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="relative group">
        {/* Left scroll button */}
        {scrollPosition > 0 && (
          <button
            onClick={() => handleScroll("left")}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Videos container */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide gap-4 pb-4"
          style={{ scrollBehavior: "smooth" }}
        >
          {visibleVideos.map((video, index) => (
            <div key={`${video.uri || video.id || index}`} className="flex-shrink-0 w-[280px]">
              <VimeoCard video={video} />
            </div>
          ))}
        </div>

        {/* Right scroll button */}
        {scrollPosition < maxScroll && (
          <button
            onClick={() => handleScroll("right")}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  )
}
