"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { getRecentVideos } from "@/lib/video-catalog-manager"

export default function BrowseAllPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
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
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Browse All Videos
            </h1>
            <p className="text-gray-400 mt-2">Discover all our content in one place</p>
          </div>

          {/* Error state */}
          {error && (
            <div className="rounded-lg bg-red-900/20 border border-red-900/30 p-6 text-center mb-8">
              <p className="text-red-400">Error loading videos: {error}</p>
              <Button onClick={() => router.push("/dashboard")} className="mt-4 bg-red-600 hover:bg-red-700 text-white">
                Go Back
              </Button>
            </div>
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
          {!isLoading && videos.length === 0 && (
            <div className="py-16 text-center">
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-white mb-3">No Videos Found</h2>
                <p className="text-gray-400 mb-8">
                  There are currently no videos available. Check back later or explore our categories.
                </p>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => router.push("/dashboard/categories")}
                >
                  Browse Categories
                </Button>
              </div>
            </div>
          )}

          {/* Videos grid */}
          {videos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {videos.map((video, index) => (
                <motion.div
                  key={video.id}
                  ref={index === videos.length - 1 ? lastVideoElementRef : undefined}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 1) }}
                >
                  <VimeoCard video={convertToVimeoVideo(video)} />
                </motion.div>
              ))}

              {/* Show skeleton loaders while loading more */}
              {isLoading &&
                videos.length > 0 &&
                Array.from({ length: 6 }).map((_, index) => <VideoSkeleton key={`loading-skeleton-${index}`} />)}
            </div>
          )}

          {/* Loading more indicator */}
          {isLoading && videos.length > 0 && (
            <div className="py-8 text-center">
              <div className="w-8 h-8 border-t-2 border-red-500 border-solid rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400">Loading more videos...</p>
            </div>
          )}

          {/* Manual load more button */}
          {!isLoading && videos.length > 0 && hasMore && (
            <div className="py-8 text-center">
              <Button onClick={loadMore} className="bg-red-600 hover:bg-red-700 text-white px-8">
                Load More Videos
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
