"use client"

import { useRef, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"
import VideoRow from "@/components/video-row"
import BorderLine from "@/components/border-line"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { useVimeoVideos } from "@/hooks/use-vimeo-videos"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { filterCategoriesBySearch } from "@/lib/search-utils"

export default function Dashboard() {
  // Get search query from URL
  const searchParams = useSearchParams()
  const searchQuery = searchParams?.get("search") || ""

  // State to store the filtered videos
  const [filteredShowcaseVideos, setFilteredShowcaseVideos] = useState<Record<string, any[]>>({})
  const [hasSearchResults, setHasSearchResults] = useState(false)

  // Fetch showcase-based videos
  const { showcaseVideos, showcaseIds, loading: loadingShowcases, error: showcaseError } = useVimeoShowcases()

  // Fetch all videos for comprehensive search
  const { videos, videosByTag, loading: loadingVideos } = useVimeoVideos()

  const router = useRouter()

  // Cleanup observer on unmount
  const observer = useRef<IntersectionObserver | null>(null)
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

  // Filter videos based on search query
  useEffect(() => {
    if (searchQuery && !loadingShowcases && !loadingVideos) {
      // Filter showcase videos
      const filteredShowcases = filterCategoriesBySearch(showcaseVideos, searchQuery)
      setFilteredShowcaseVideos(filteredShowcases)

      // Check if we have any search results
      const hasResults = Object.keys(filteredShowcases).length > 0
      setHasSearchResults(hasResults)

      // If no results in showcases but we have the search query from localStorage,
      // we can also search through all videos as a fallback
      if (!hasResults && localStorage.getItem("lastSearchQuery") === searchQuery) {
        // This would be a place to implement a more comprehensive search
        // through all videos if needed
      }
    } else {
      // If no search query, show all showcase videos
      setFilteredShowcaseVideos(showcaseVideos)
      setHasSearchResults(Object.keys(showcaseVideos).length > 0)
    }
  }, [searchQuery, showcaseVideos, loadingShowcases, loadingVideos, videosByTag, videos])

  // Get showcase names based on whether we're searching or not
  const showcaseNames = Object.keys(searchQuery ? filteredShowcaseVideos : showcaseVideos)

  // Check if we're still loading initial data
  const isLoading = (loadingShowcases || loadingVideos) && showcaseNames.length === 0

  // Check for errors
  const error = showcaseError

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <DashboardHeader initialSearchQuery={searchQuery} />

      <main className="pt-20 pb-16 relative z-10">
        {/* Search Results Header (if searching) */}
        {searchQuery && (
          <div className="px-6 mb-8">
            <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-light tracking-wider text-white mb-2">Search Results for "{searchQuery}"</h2>
              <p className="text-gray-400">
                {hasSearchResults
                  ? `Found results in ${Object.keys(filteredShowcaseVideos).length} categories`
                  : "No results found. Try a different search term."}
              </p>
            </div>
          </div>
        )}

        {/* Browse All Banner (if not searching) */}
        {!searchQuery && (
          <div className="px-6 mb-8">
            <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-6 flex flex-col md:flex-row justify-between items-center">
              <div>
                <h2 className="text-2xl font-light tracking-wider text-white mb-2">Browse All Content</h2>
                <p className="text-gray-400 mb-4 md:mb-0">Explore our complete collection of clips</p>
              </div>
              <Button
                onClick={() => router.push("/category/browse-all")}
                className="bg-crimson hover:bg-crimson-dark text-white"
              >
                View All Clips
              </Button>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="px-6 py-10 text-center">
            <p className="text-red-500">Error loading videos: {error}</p>
          </div>
        )}

        {/* Loading state (initial) */}
        {isLoading && (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-400">Loading videos...</p>
          </div>
        )}

        {/* Showcase-based categories */}
        {showcaseNames.length > 0 && (
          <>
            {showcaseNames.map((showcaseName, index) => {
              const videosToShow = searchQuery ? filteredShowcaseVideos[showcaseName] : showcaseVideos[showcaseName]
              return (
                <div key={`showcase-${showcaseName}`}>
                  <VideoRow
                    title={showcaseName}
                    videos={videosToShow}
                    limit={6}
                    isShowcase={true}
                    showcaseId={showcaseIds[showcaseName]}
                  />
                  {index < showcaseNames.length - 1 && <BorderLine className="my-2" />}
                </div>
              )
            })}
          </>
        )}

        {/* No videos state */}
        {!isLoading && showcaseNames.length === 0 && (
          <div className="px-6 py-10 text-center">
            {searchQuery ? (
              <p className="text-gray-400">No videos found matching "{searchQuery}". Try a different search term.</p>
            ) : (
              <p className="text-gray-400">
                No videos found. Make sure your Vimeo account has videos and your API credentials are correct.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
