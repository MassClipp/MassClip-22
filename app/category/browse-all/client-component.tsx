"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, Search, Filter } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"
import { Button } from "@/components/ui/button"
import type { VimeoApiResponse, VimeoVideo } from "@/lib/types"
import { shuffleArray } from "@/lib/utils"

export default function ClientBrowseAll() {
  const [videos, setVideos] = useState<VimeoVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredVideos, setFilteredVideos] = useState<VimeoVideo[]>([])
  const [showSearch, setShowSearch] = useState(false)

  const observer = useRef<IntersectionObserver | null>(null)
  const pageSize = 36
  const isMounted = useRef(true)
  const processedUris = useRef<Set<string>>(new Set())

  const fetchVideos = async (pageNum: number) => {
    if (isFetching) return

    try {
      setIsFetching(true)
      setLoading(true)

      console.log(`🔥 Fetching Vimeo videos page ${pageNum} (${pageSize} per page)`)
      const response = await fetch(`/api/vimeo?page=${pageNum}&per_page=${pageSize}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to fetch videos")
      }

      const data: VimeoApiResponse = await response.json()
      console.log(`🔥 Received ${data.data.length} videos from Vimeo API`)

      // Update videos
      setVideos((prev) => {
        // Filter out duplicates using our Set
        const newVideos = data.data.filter((video) => {
          if (!video.uri || processedUris.current.has(video.uri)) {
            return false
          }
          processedUris.current.add(video.uri)
          return true
        })

        // Combine previous and new videos
        const combinedVideos = [...prev, ...newVideos]

        // Shuffle videos instead of sorting alphabetically
        return shuffleArray(combinedVideos)
      })

      // Check if there are more videos to load
      setHasMore(!!data.paging.next)
    } catch (err) {
      console.error("Error fetching videos:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch videos")
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  // Filter videos based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredVideos(videos)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = videos.filter(
        (video) =>
          video.name?.toLowerCase().includes(query) ||
          video.description?.toLowerCase().includes(query) ||
          video.tags?.some((tag: any) => tag.name.toLowerCase().includes(query)),
      )
      setFilteredVideos(filtered)
    }
  }, [searchQuery, videos])

  // Load more videos
  const loadMore = () => {
    if (!loading && !isFetching && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchVideos(nextPage)
    }
  }

  // Reference for infinite scrolling
  const lastVideoElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      })

      if (node) observer.current.observe(node)
    },
    [loading, hasMore],
  )

  // Fetch videos on mount
  useEffect(() => {
    isMounted.current = true
    fetchVideos(1)

    return () => {
      isMounted.current = false
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

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
          {loading && videos.length === 0 && (
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
          {!loading || videos.length > 0 ? (
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
                        key={video.uri}
                        ref={index === filteredVideos.length - 1 ? lastVideoElementRef : undefined}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 1) }}
                      >
                        <VimeoCard video={video} />
                      </motion.div>
                    ))}

                    {/* Show skeleton loaders while loading more */}
                    {loading &&
                      filteredVideos.length > 0 &&
                      Array.from({ length: 6 }).map((_, index) => <VideoSkeleton key={`loading-skeleton-${index}`} />)}
                  </div>
                </>
              ) : !loading ? (
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
          {loading && filteredVideos.length > 0 && (
            <div className="py-8 text-center">
              <div className="w-8 h-8 border-t-2 border-red-500 border-solid rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400">Loading more videos...</p>
            </div>
          )}

          {/* Manual load more button */}
          {!loading && filteredVideos.length > 0 && hasMore && !isFetching && (
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
