"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { VimeoVideo } from "@/lib/types"
import VimeoCard from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"

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
  const rowRef = useRef<HTMLDivElement>(null)

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
      // Sort videos alphabetically by title instead of shuffling
      const sortedVideos = [...videos]
        .sort((a, b) => {
          // Sort by name (title) alphabetically
          const nameA = (a.name || "").toLowerCase()
          const nameB = (b.name || "").toLowerCase()
          return nameA.localeCompare(nameB)
        })
        .slice(0, limit)

      setVisibleVideos(sortedVideos)
    }
  }, [isIntersecting, videos, limit])

  if (!videos || videos.length === 0) {
    return null
  }

  const hasMore = videos.length > limit

  return (
    <section className="mb-12 category-section" ref={rowRef}>
      <div className="px-6 mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-extralight tracking-wider text-white category-title">{title}</h2>
        {hasMore && (
          <Link href={linkPath} className="text-gray-400 hover:text-white flex items-center">
            {buttonText} <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        )}
      </div>
      <div className="relative">
        <div className="flex overflow-x-auto scrollbar-hide gap-4 px-6 pb-4">
          {isIntersecting
            ? visibleVideos.map((video) => <VimeoCard key={video.uri} video={video} />)
            : // Show skeleton loaders while waiting for intersection
              Array.from({ length: Math.min(limit, 6) }).map((_, index) => <VideoSkeleton key={index} />)}
        </div>
      </div>
    </section>
  )
}
