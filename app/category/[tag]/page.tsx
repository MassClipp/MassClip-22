"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Search, Filter, ArrowUpRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"
import { Button } from "@/components/ui/button"
import { shuffleArray } from "@/lib/utils"
import { getVideosByCategory } from "@/lib/video-catalog-manager"

// Map URL-friendly tags to display names
const CATEGORY_MAP = {
  "hustle-mentality": "Hustle Mentality",
  "money-and-wealth": "Money & Wealth",
  introspection: "Introspection",
  faith: "Faith",
  "high-energy-motivation": "High Energy Motivation",
  "motivational-speeches": "Motivational Speeches",
}

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const tagSlug = params.tag as string
  const [isLoading, setIsLoading] = useState(true)
  const [noContentMessage, setNoContentMessage] = useState<string | null>(null)
  const [redirectInProgress, setRedirectInProgress] = useState(false)
  const [videos, setVideos] = useState<any[]>([])
  const [shuffledVideos, setShuffledVideos] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredVideos, setFilteredVideos] = useState<any[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const LIMIT_PER_PAGE = 24

  // Format tag for display
  const tag = decodeURIComponent(tagSlug.replace(/-/g, " "))
  const displayTag =
    CATEGORY_MAP[tagSlug] ||
    tag
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

  // Special case for "browse all"
  useEffect(() => {
    if (tag.toLowerCase() === "browse all") {
      router.push("/category/browse-all")
    }
  }, [tag, router])

  // Fetch videos from our catalog
  useEffect(() => {
    async function fetchVideos() {
      if (redirectInProgress || tag.toLowerCase() === "browse all") return

      try {
        setIsLoading(true)
        const result = await getVideosByCategory(tagSlug, LIMIT_PER_PAGE * page)

        if (result && Array.isArray(result)) {
          setVideos(result)
          // Check if we might have more videos
          setHasMore(result.length === LIMIT_PER_PAGE * page)
        } else {
          setVideos([])
          setHasMore(false)
        }
      } catch (err) {
        console.error("Error fetching videos:", err)
        setError("Failed to load videos. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchVideos()
  }, [tagSlug, page, redirectInProgress, tag])

  // Shuffle videos when they change
  useEffect(() => {
    if (videos && videos.length > 0) {
      const shuffled = shuffleArray([...videos])
      setShuffledVideos(shuffled)
      setFilteredVideos(shuffled)
    }
  }, [videos])

  // Filter videos based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredVideos(shuffledVideos)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = shuffledVideos.filter(
        (video) =>
          video.title?.toLowerCase().includes(query) ||
          video.description?.toLowerCase().includes(query) ||
          video.tags?.some((tag: string) => tag.toLowerCase().includes(query)),
      )
      setFilteredVideos(filtered)
    }
  }, [searchQuery, shuffledVideos])

  // Update loading state and set appropriate message for empty categories
  useEffect(() => {
    if (!isLoading && videos.length === 0) {
      const customMessages: Record<string, string> = {
        "money-and-wealth":
          "Our Money and Wealth collection is coming soon. Upgrade to Pro to get notified when new content is added.",
        "high-energy-motivation":
          "Our High Energy Motivation collection is coming soon. Upgrade to Pro to get notified when new content is added.",
        "hustle-mentality":
          "Our Hustle Mentality collection is coming soon. Upgrade to Pro to get notified when new content is added.",
        introspection:
          "Our Introspection collection is coming soon. Upgrade to Pro to get notified when new content is added.",
        faith: "Our Faith collection is coming soon. Upgrade to Pro to get notified when new content is added.",
        "motivational-speeches":
          "Our Motivational Speeches collection is coming soon. Upgrade to Pro to get notified when new content is added.",
      }

      if (customMessages[tagSlug]) {
        setNoContentMessage(customMessages[tagSlug])
      } else {
        setNoContentMessage("No videos found for this category. Try browsing other categories or check back later.")
      }
    } else {
      setNoContentMessage(null)
    }
  }, [isLoading, videos, tagSlug])

  // Load more videos
  const loadMore = useCallback(() => {
    setPage((prevPage) => prevPage + 1)
  }, [])

  // Reference for infinite scrolling
  const observer = useRef<IntersectionObserver | null>(null)
  const lastVideoElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      })

      if (node) observer.current.observe(node)
    },
    [isLoading, hasMore, loadMore],
  )

  // Helper function to convert our catalog video format to the VimeoVideo format expected by VimeoCard
  const convertToVimeoVideo = (catalogVideo: any) => {
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

  // If this is "browse all" or we're redirecting, show a loading state
  if (tag.toLowerCase() === "browse all" || redirectInProgress) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>
        <DashboardHeader />
        <main className="pt-20 pb-16 relative z-10">
          <div className="px-6 py-10 text-center">
            <div className="w-8 h-8 border-t-2 border-red-500 border-solid rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="container mx-auto px-4 sm:px-6"
        >
          {/* Header with back button and title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center">
              <Link
                href="/dashboard/categories"
                className="mr-4 p-2 rounded-full bg-gray-900/80 hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              </Link>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                {displayTag}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <AnimatePresence>
                {showSearch && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    <input
                      type="text"
                      placeholder="Search in this category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-gray-900/80 border border-gray-800 rounded-lg py-2 px-4 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 w-full"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                variant="outline"
                size="sm"
                className="border-gray-800 bg-gray-900/80 hover:bg-gray-800 text-gray-300"
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="h-4 w-4 mr-2" />
                {!showSearch && "Search"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="border-gray-800 bg-gray-900/80 hover:bg-gray-800 text-gray-300"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg bg-red-900/20 border border-red-900/30 p-6 text-center mb-8"
            >
              <p className="text-red-400">Error loading videos: {error}</p>
              <Button
                onClick={() => router.push("/dashboard/categories")}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white"
              >
                Go Back
              </Button>
            </motion.div>
          )}

          {/* Loading state (initial) */}
          {isLoading && videos.length === 0 && (
            <div className="py-10">
              <div className="w-8 h-8 border-t-2 border-red-500 border-solid rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-gray-400 text-center mb-8">Loading videos for {displayTag}...</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {Array.from({ length: 12 }).map((_, index) => (
                  <VideoSkeleton key={`skeleton-${index}`} />
                ))}
              </div>
            </div>
          )}

          {/* Videos grid */}
          {!isLoading && (
            <>
              {filteredVideos.length > 0 ? (
                <>
                  {searchQuery && (
                    <div className="mb-6 text-sm text-gray-400">
                      Found {filteredVideos.length} results for "{searchQuery}"
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {filteredVideos.map((video, index) => (
                      <motion.div
                        key={video.id}
                        ref={index === filteredVideos.length - 1 ? lastVideoElementRef : undefined}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 1) }}
                      >
                        <VimeoCard video={convertToVimeoVideo(video)} />
                      </motion.div>
                    ))}

                    {/* Show skeleton loaders while loading more */}
                    {isLoading &&
                      filteredVideos.length > 0 &&
                      Array.from({ length: 6 }).map((_, index) => <VideoSkeleton key={`loading-skeleton-${index}`} />)}
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
                  <div className="max-w-md mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-3">{displayTag} Collection</h2>
                    <p className="text-gray-400 mb-8">{noContentMessage}</p>
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white inline-flex items-center"
                      onClick={() => router.push("/dashboard/categories")}
                    >
                      Browse Categories
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* Loading more indicator */}
          {isLoading && filteredVideos.length > 0 && (
            <div className="py-8 text-center">
              <div className="w-8 h-8 border-t-2 border-red-500 border-solid rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400">Loading more videos...</p>
            </div>
          )}

          {/* Manual load more button */}
          {!isLoading && filteredVideos.length > 0 && hasMore && (
            <div className="py-8 text-center">
              <Button onClick={loadMore} className="bg-red-600 hover:bg-red-700 text-white px-8">
                Load More Videos
              </Button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
