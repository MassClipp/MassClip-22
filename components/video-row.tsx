"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronRight, ChevronLeft, ArrowRight } from "lucide-react"
import type { VimeoVideo } from "@/lib/types"
import VimeoCard from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"
import { shuffleArray } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import LockedClipCard from "@/components/locked-clip-card"
import { useUserPlan } from "@/hooks/use-user-plan"

interface VideoRowProps {
  title: string
  videos: VimeoVideo[]
  limit?: number
  isShowcase?: boolean
  showcaseId?: string
}

export default function VideoRow({ title, videos, limit = 10, isShowcase = false, showcaseId }: VideoRowProps) {
  const [visibleVideos, setVisibleVideos] = useState<VimeoVideo[]>([])
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [maxScroll, setMaxScroll] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { isProUser } = useUserPlan()
  const [randomSeed, setRandomSeed] = useState(Math.random()) // Random seed for consistent shuffling within a session

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
      if (isProUser) {
        // Pro users get completely random videos - no organization at all
        // Use a different random seed each time for maximum randomness
        const shuffledVideos = shuffleArray([...videos], Math.random()).slice(0, limit)
        setVisibleVideos(shuffledVideos)
      } else {
        // Free users get alphabetically sorted videos
        const sortedVideos = [...videos]
          .sort((a, b) => {
            // Sort by name, or if names are equal, by URI
            if (a.name && b.name) {
              const nameCompare = a.name.localeCompare(b.name)
              if (nameCompare !== 0) return nameCompare
            }
            return a.uri?.localeCompare(b.uri || "") || 0
          })
          .slice(0, limit)
        setVisibleVideos(sortedVideos)
      }
    }
  }, [isIntersecting, videos, limit, isProUser, randomSeed])

  // Reshuffle videos periodically for pro users to ensure maximum randomness
  useEffect(() => {
    if (!isProUser || !isIntersecting || !videos || videos.length === 0) return

    // Reshuffle every 60 seconds for pro users
    const reshuffleInterval = setInterval(() => {
      setRandomSeed(Math.random())
      const reshuffled = shuffleArray([...videos], Math.random()).slice(0, limit)
      setVisibleVideos(reshuffled)
    }, 60000)

    return () => clearInterval(reshuffleInterval)
  }, [videos, isProUser, isIntersecting, limit])

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

  // Function to reshuffle videos for pro users
  const handleReshuffle = () => {
    if (isProUser && videos) {
      setRandomSeed(Math.random())
      const reshuffled = shuffleArray([...videos], Math.random()).slice(0, limit)
      setVisibleVideos(reshuffled)
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
          {isProUser && isIntersecting && (
            <button
              onClick={handleReshuffle}
              className="text-zinc-400 hover:text-white text-xs bg-zinc-900/30 hover:bg-zinc-900/50 px-2 py-1 rounded-full transition-all duration-300"
            >
              Shuffle
            </button>
          )}
          {hasMore && (
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
          className="flex overflow-x-auto scrollbar-hide gap-4 px-6 pb-4"
          onScroll={handleManualScroll}
        >
          {isIntersecting
            ? visibleVideos.map((video, index) => {
                // For free users, show locked cards after the first 5 videos
                if (!isProUser && index >= 5) {
                  // Get thumbnail URL for the locked card background
                  const thumbnailUrl = video?.pictures?.sizes
                    ? [...video.pictures.sizes].sort((a, b) => b.width - a.width)[0].link
                    : undefined

                  return (
                    <motion.div
                      key={`locked-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <LockedClipCard thumbnailUrl={thumbnailUrl} />
                    </motion.div>
                  )
                }

                return (
                  <motion.div
                    key={video.uri}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <VimeoCard video={video} />
                  </motion.div>
                )
              })
            : // Show skeleton loaders while waiting for intersection
              Array.from({ length: Math.min(limit, 10) }).map((_, index) => <VideoSkeleton key={index} />)}
        </div>
      </div>
    </section>
  )
}
