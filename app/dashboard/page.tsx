"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Search, ChevronRight } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import VideoRow from "@/components/video-row"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { useVimeoVideos } from "@/hooks/use-vimeo-videos"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { filterCategoriesBySearch } from "@/lib/search-utils"
import VimeoCard from "@/components/vimeo-card"
import { shuffleArray } from "@/lib/utils"

export default function Dashboard() {
  // Get search query from URL
  const searchParams = useSearchParams()
  const searchQuery = searchParams?.get("search") || ""

  // State to store the filtered videos
  const [filteredShowcaseVideos, setFilteredShowcaseVideos] = useState<Record<string, any[]>>({})
  const [hasSearchResults, setHasSearchResults] = useState(false)
  const [featuredVideos, setFeaturedVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch showcase-based videos
  const { showcaseVideos, showcaseIds, loading: loadingShowcases, error: showcaseError } = useVimeoShowcases()

  // Fetch all videos for comprehensive search
  const { videos, videosByTag, loading: loadingVideos } = useVimeoVideos()

  const router = useRouter()

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

  // Prepare featured videos from all showcases
  useEffect(() => {
    if (!loadingShowcases && !loadingVideos && Object.keys(showcaseVideos).length > 0) {
      // Collect videos from all showcases
      const allVideos = Object.values(showcaseVideos).flat()

      // Shuffle and take the first 6 for featured section
      if (allVideos.length > 0) {
        setFeaturedVideos(shuffleArray(allVideos).slice(0, 6))
      }

      setIsLoading(false)
    }
  }, [showcaseVideos, loadingShowcases, loadingVideos])

  // Check if we're still loading initial data
  const isLoadingData = (loadingShowcases || loadingVideos) && showcaseNames.length === 0

  // Check for errors
  const error = showcaseError

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1.0],
      },
    },
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-zinc-900">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
        </div>
        <div className="absolute top-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-zinc-900/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-t from-zinc-900/20 to-transparent"></div>
      </div>

      <DashboardHeader initialSearchQuery={searchQuery} />

      <main className="pt-20 pb-16 relative z-10">
        {/* Search Results Header (if searching) */}
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-6 mb-8"
          >
            <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-light tracking-wider text-white mb-2 flex items-center">
                <Search className="h-5 w-5 mr-2 text-zinc-400" />
                Results for "{searchQuery}"
              </h2>
              <p className="text-zinc-400">
                {hasSearchResults
                  ? `Found results in ${Object.keys(filteredShowcaseVideos).length} categories`
                  : "No results found. Try a different search term."}
              </p>
            </div>
          </motion.div>
        )}

        {/* Featured Section (if not searching) */}
        {!searchQuery && !isLoadingData && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-6 mb-12">
            <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-extralight tracking-tight text-white">
                Find Your Next <span className="text-gradient-accent">Viral Clip</span>
              </h1>
              <Button
                onClick={() => router.push("/category/browse-all")}
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-900/50 rounded-full px-4 py-2 transition-all duration-300"
              >
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </motion.div>

            {/* Featured Videos Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {isLoading
                ? // Skeleton loaders
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="aspect-[9/16] rounded-xl bg-zinc-900/50 animate-pulse"
                    ></div>
                  ))
                : // Featured videos
                  featuredVideos.map((video, index) => (
                    <div key={`featured-${video.uri || index}`} className="group">
                      <VimeoCard video={video} />
                    </div>
                  ))}
            </motion.div>
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <div className="px-6 py-10 text-center">
            <p className="text-red-500">Error loading videos: {error}</p>
          </div>
        )}

        {/* Loading state (initial) */}
        {isLoadingData && (
          <div className="px-6 py-10">
            <div className="h-8 w-48 bg-zinc-900/50 rounded-md animate-pulse mb-8"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="aspect-[9/16] rounded-xl bg-zinc-900/50 animate-pulse"></div>
              ))}
            </div>
          </div>
        )}

        {/* Showcase-based categories */}
        {showcaseNames.length > 0 && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-12">
            {showcaseNames.map((showcaseName, index) => {
              const videosToShow = searchQuery ? filteredShowcaseVideos[showcaseName] : showcaseVideos[showcaseName]
              return (
                <motion.div key={`showcase-${showcaseName}`} variants={itemVariants}>
                  <VideoRow
                    title={showcaseName}
                    videos={videosToShow}
                    limit={10}
                    isShowcase={true}
                    showcaseId={showcaseIds[showcaseName]}
                  />
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* No videos state */}
        {!isLoadingData && showcaseNames.length === 0 && (
          <div className="px-6 py-10 text-center">
            {searchQuery ? (
              <p className="text-zinc-400">No videos found matching "{searchQuery}". Try a different search term.</p>
            ) : (
              <p className="text-zinc-400">
                No videos found. Make sure your Vimeo account has videos and your API credentials are correct.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
