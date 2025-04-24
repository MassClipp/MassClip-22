"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"
import { useVimeoTagVideos } from "@/hooks/use-vimeo-tag-videos"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { Button } from "@/components/ui/button"
import VideoSkeleton from "@/components/video-skeleton"

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const tagSlug = params.tag as string
  const tag = decodeURIComponent(tagSlug.replace(/-/g, " "))
  const { showcaseIds, categoryToShowcaseMap } = useVimeoShowcases()
  const [isLoading, setIsLoading] = useState(true)
  const [noContentMessage, setNoContentMessage] = useState<string | null>(null)
  const [redirectInProgress, setRedirectInProgress] = useState(false)

  // Special case for "browse all"
  useEffect(() => {
    if (tag.toLowerCase() === "browse all") {
      router.push("/category/browse-all")
    }
  }, [tag, router])

  // Format tag name for display (capitalize first letter of each word)
  const formatTagName = (tag: string): string => {
    return tag
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const displayTag = formatTagName(tag)

  // Helper function to normalize category names
  const normalizeCategory = (category: string): string => {
    return category.trim().toLowerCase().replace(/\s+/g, " ")
  }

  // Check if this category should be a showcase instead
  useEffect(() => {
    const checkForShowcase = async () => {
      // Don't redirect if we're already redirecting or for "browse all"
      if (redirectInProgress || tag.toLowerCase() === "browse all") return

      // Check if we have a direct showcase mapping in showcaseIds
      const directShowcaseId = Object.entries(showcaseIds).find(
        ([name]) => normalizeCategory(name) === normalizeCategory(tag),
      )?.[1]

      if (directShowcaseId) {
        console.log(`Found direct showcase ${directShowcaseId} for category ${tag}, redirecting...`)
        setRedirectInProgress(true)
        router.push(`/showcase/${directShowcaseId}`)
        return
      }

      // Check if we have a mapping in categoryToShowcaseMap
      const mappedShowcaseName = Object.entries(categoryToShowcaseMap || {}).find(
        ([mappedCategory]) => normalizeCategory(mappedCategory) === normalizeCategory(tag),
      )?.[1]

      if (mappedShowcaseName && showcaseIds[mappedShowcaseName]) {
        console.log(`Found mapped showcase for category ${tag}, redirecting...`)
        setRedirectInProgress(true)
        router.push(`/showcase/${showcaseIds[mappedShowcaseName]}`)
        return
      }
    }

    checkForShowcase()
  }, [tag, showcaseIds, categoryToShowcaseMap, router, redirectInProgress])

  const { videos, loading, error, hasMore, loadMore } = useVimeoTagVideos(tag)
  const observer = useRef<IntersectionObserver | null>(null)

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
    [loading, hasMore, loadMore],
  )

  // Update loading state and set appropriate message for empty categories
  useEffect(() => {
    setIsLoading(loading && videos.length === 0)

    // Set appropriate message for empty categories
    if (!loading && videos.length === 0) {
      // Custom messages for specific categories
      const customMessages: Record<string, string> = {
        "money and wealth":
          "Our Money and Wealth collection is coming soon. Upgrade to Pro to get notified when new content is added.",
        "high energy motivation":
          "Our High Energy Motivation collection is coming soon. Upgrade to Pro to get notified when new content is added.",
        "hustle mentality":
          "Our Hustle Mentality collection is coming soon. Upgrade to Pro to get notified when new content is added.",
        mindset: "Our Mindset collection is coming soon. Upgrade to Pro to get notified when new content is added.",
        introspection:
          "Our Introspection collection is coming soon. Upgrade to Pro to get notified when new content is added.",
      }

      const lowerTag = tag.toLowerCase()
      if (customMessages[lowerTag]) {
        setNoContentMessage(customMessages[lowerTag])
      } else {
        setNoContentMessage("No videos found for this category. Try browsing other categories or check back later.")
      }
    } else {
      setNoContentMessage(null)
    }
  }, [loading, videos, tag])

  // If this is "browse all" or we're redirecting, show a loading state
  if (tag.toLowerCase() === "browse all" || redirectInProgress) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <div className="fixed inset-0 z-0 static-gradient-bg"></div>
        <DashboardHeader />
        <main className="pt-20 pb-16 relative z-10">
          <div className="px-6 py-10 text-center">
            <p className="text-gray-400">Loading...</p>
          </div>
        </main>
      </div>
    )
  }

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
          <h1 className="text-3xl font-bold">{displayTag}</h1>
        </div>

        {/* Error state */}
        {error && (
          <div className="px-6 py-10 text-center">
            <p className="text-red-500">Error loading videos: {error}</p>
          </div>
        )}

        {/* Loading state (initial) */}
        {isLoading && (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-400">Loading videos for {displayTag}...</p>
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
          ) : !isLoading ? (
            <div className="py-10 text-center">
              <p className="text-gray-300 text-xl mb-2">{displayTag} Collection</p>
              <p className="text-gray-400">{noContentMessage}</p>
              <Button
                className="mt-6 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => router.push("/dashboard/categories")}
              >
                Browse Categories
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
        {!loading && videos.length > 0 && hasMore && (
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
