"use client"

import { useRef, useCallback, useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"
import { Button } from "@/components/ui/button"
import type { VimeoApiResponse, VimeoVideo } from "@/lib/types"
import { shuffleArray } from "@/lib/utils" // Import the shuffleArray utility

export default function ShowcasePage() {
  const params = useParams()
  const showcaseId = params.id as string

  const [videos, setVideos] = useState<VimeoVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showcaseName, setShowcaseName] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  const observer = useRef<IntersectionObserver | null>(null)
  const isMounted = useRef(true)
  const processedUris = useRef<Set<string>>(new Set())

  const fetchShowcaseDetails = async () => {
    try {
      // Try to fetch showcase details to get the name
      const showcaseResponse = await fetch(`/api/vimeo/showcases/${showcaseId}`)
      if (showcaseResponse.ok) {
        const showcaseData = await showcaseResponse.json()
        setShowcaseName(showcaseData.name || "Showcase Videos")
      } else {
        setShowcaseName("Showcase Videos")
      }
    } catch (err) {
      console.error("Error fetching showcase details:", err)
      setShowcaseName("Showcase Videos")
    }
  }

  const fetchShowcaseVideos = async (pageNum: number) => {
    if (isFetching) return

    try {
      setIsFetching(true)
      setLoading(true)

      console.log(`Fetching showcase ${showcaseId} videos, page ${pageNum}`)
      const response = await fetch(`/api/vimeo/showcases/${showcaseId}/videos?page=${pageNum}&per_page=30`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to fetch showcase videos")
      }

      const data: VimeoApiResponse = await response.json()

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

        // Combine and shuffle videos instead of sorting
        const combinedVideos = [...prev, ...newVideos]
        return shuffleArray(combinedVideos)
      })

      // Check if there are more videos to load
      setHasMore(!!data.paging.next)

      // If we don't have a name yet, try to get it from the first video's showcase
      if (!showcaseName && data.data.length > 0) {
        await fetchShowcaseDetails()
      }
    } catch (err) {
      console.error("Error fetching showcase videos:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch showcase videos")
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  const loadMore = () => {
    if (!loading && !isFetching && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchShowcaseVideos(nextPage)
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

  useEffect(() => {
    // Reset state and fetch data
    setVideos([])
    processedUris.current.clear()
    setPage(1)
    fetchShowcaseDetails()
    fetchShowcaseVideos(1)

    // Cleanup function
    return () => {
      isMounted.current = false
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [showcaseId]) // Run when showcase ID changes

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
          <h1 className="text-3xl font-bold">{showcaseName}</h1>
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
              <p className="text-gray-300 text-xl mb-2">{showcaseName}</p>
              <p className="text-gray-400">No videos found in this showcase.</p>
              <Button className="mt-6 bg-red-600 hover:bg-red-700 text-white" onClick={() => window.history.back()}>
                Go Back
              </Button>
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
