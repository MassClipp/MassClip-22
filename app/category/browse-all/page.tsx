"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"
import { Button } from "@/components/ui/button"
import type { VimeoApiResponse, VimeoVideo } from "@/lib/types"
import { shuffleArray } from "@/lib/utils" // Import the shuffleArray utility

export default function BrowseAllPage() {
  const [videos, setVideos] = useState<VimeoVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  const observer = useRef<IntersectionObserver | null>(null)
  const pageSize = 36 // Increased page size to load more videos at once
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
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <div className="px-6 mb-6 flex items-center">
          <Link href="/dashboard/categories" className="text-gray-400 hover:text-white flex items-center mr-4">
            <ChevronLeft className="h-5 w-5" />
            Back to Categories
          </Link>
          <h1 className="text-3xl font-bold">Browse All Videos</h1>
        </div>

        {/* Error state */}
        {error && (
          <div className="px-6 py-10 text-center">
            <p className="text-red-500">Error loading videos: {error}</p>
          </div>
        )}

        {/* Loading state (initial) */}
        {loading && videos.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-400">Loading videos...</p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <VideoSkeleton key={`skeleton-${index}`} />
              ))}
            </div>
          </div>
        )}

        {/* Videos grid */}
        <div className="px-6">
          {videos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {videos.map((video, index) => (
                <div key={video.uri} ref={index === videos.length - 1 ? lastVideoElementRef : undefined}>
                  <VimeoCard video={video} />
                </div>
              ))}

              {/* Show skeleton loaders while loading more */}
              {loading &&
                videos.length > 0 &&
                Array.from({ length: 6 }).map((_, index) => <VideoSkeleton key={`loading-skeleton-${index}`} />)}
            </div>
          ) : !loading ? (
            <div className="py-10 text-center">
              <p className="text-gray-400">No videos found. Please check your Vimeo API credentials.</p>
            </div>
          ) : null}
        </div>

        {/* Loading more indicator */}
        {loading && videos.length > 0 && (
          <div className="px-6 py-4 text-center">
            <p className="text-gray-400">Loading more videos...</p>
          </div>
        )}

        {/* Manual load more button */}
        {!loading && videos.length > 0 && hasMore && !isFetching && (
          <div className="px-6 py-4 text-center">
            <Button onClick={loadMore} className="bg-red-600 hover:bg-red-700 text-white">
              Load More Videos
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
