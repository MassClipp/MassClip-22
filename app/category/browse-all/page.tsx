"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Search, Filter } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"
import { Button } from "@/components/ui/button"
import { getRecentVideos } from "@/lib/video-catalog-manager"

export default function BrowseAllPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredVideos, setFilteredVideos] = useState<any[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const LIMIT_PER_PAGE = 24

  // Fetch videos from our catalog
  useEffect(() => {
    async function fetchVideos() {
      try {
        setIsLoading(true)
        const result = await getRecentVideos(LIMIT_PER_PAGE * page)

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
  }, [page])

  // Filter videos based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredVideos(videos)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = videos.filter(
        (video) =>
          video.title?.toLowerCase().includes(query) ||
          video.description?.toLowerCase().includes(query) ||
          video.tags?.some((tag: string) => tag.toLowerCase().includes(query)),
      )
      setFilteredVideos(filtered)
    }
  }, [searchQuery, videos])

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
                Browse All Videos
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
                      placeholder="Search all videos..."
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
            </motion.div>
          )}

          {/* Loading state (initial) */}
          {isLoading && videos.length === 0 && (
            <div className="py-10">
              <div className="w-8 h-8 border-t-2 border-red-500 border-solid rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-gray-400 text-center mb-8">Loading videos...</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {Array.from({ length: 12 }).map((_, index) => (
                  <VideoSkeleton key={`skeleton-${index}`} />
                ))}
              </div>
            </div>
          )}

          {/* Videos grid */}
          {!isLoading || videos.length > 0 ? (
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
              ) : !isLoading ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
                  <div className="max-w-md mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-3">No Videos Found</h2>
                    <p className="text-gray-400 mb-8">
                      {searchQuery
                        ? `No videos match your search for "${searchQuery}". Try a different search term.`
                        : "No videos found. Please check your Vimeo API credentials."}
                    </p>
                    {searchQuery && (
                      <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setSearchQuery("")}>
                        Clear Search
                      </Button>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </>
          ) : null}

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
