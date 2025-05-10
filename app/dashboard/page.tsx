"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Search, Clock, Brain, Rocket, ChevronRight, TrendingUp, Loader2 } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import VideoRow from "@/components/video-row"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { useVimeoVideos } from "@/hooks/use-vimeo-videos"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { filterCategoriesBySearch } from "@/lib/search-utils"
import VimeoCard from "@/components/vimeo-card"
import { shuffleArray } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

// Define our categories
const CATEGORIES = [
  { slug: "hustle-mentality", title: "Hustle Mentality" },
  { slug: "money-and-wealth", title: "Money & Wealth" },
  { slug: "introspection", title: "Introspection" },
  { slug: "faith", title: "Faith" },
  { slug: "high-energy-motivation", title: "High Energy Motivation" },
  { slug: "motivational-speeches", title: "Motivational Speeches" },
]

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const [recentlyAdded, setRecentlyAdded] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Get search query from URL
  const searchParams = useSearchParams()
  const searchQuery = searchParams?.get("search") || ""

  // State to store the filtered videos
  const [filteredShowcaseVideos, setFilteredShowcaseVideos] = useState<Record<string, any[]>>({})
  const [hasSearchResults, setHasSearchResults] = useState(false)
  const [featuredVideos, setFeaturedVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

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

  // Check if we have the specific showcases
  const hasIntrospection = showcaseNames.some(
    (name) =>
      name.toLowerCase().includes("introspection") ||
      name.toLowerCase().includes("reflection") ||
      name.toLowerCase().includes("mindfulness"),
  )

  const hasHustleMentality = showcaseNames.some(
    (name) =>
      name.toLowerCase().includes("hustle") ||
      name.toLowerCase().includes("grind") ||
      name.toLowerCase().includes("entrepreneur"),
  )

  // Quick category navigation
  const quickCategories = [
    { name: "Introspection", icon: <Brain className="h-4 w-4 md:h-5 md:w-5" />, href: "/category/introspection" },
    { name: "Hustle", icon: <Rocket className="h-4 w-4 md:h-5 md:w-5" />, href: "/category/hustle-mentality" },
    { name: "Recent", icon: <Clock className="h-4 w-4 md:h-5 md:w-5" />, href: "/category/recently-added" },
    { name: "All", icon: <Search className="h-4 w-4 md:h-5 md:w-5" />, href: "/dashboard/categories" },
  ]

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
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

        {/* Category Quick Links (if not searching) */}
        {!searchQuery && !isLoadingData && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-6 mb-12">
            <motion.h3
              variants={itemVariants}
              className="text-xl font-light tracking-tight text-white mb-4 flex items-center"
            >
              <TrendingUp className="h-4 w-4 mr-2 text-zinc-400" />
              Trending Categories
            </motion.h3>

            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickCategories.map((category, index) => (
                <Button
                  key={category.name}
                  onClick={() => {
                    setActiveCategory(category.name)
                    router.push(category.href)
                  }}
                  variant="outline"
                  className={`flex items-center justify-start h-auto py-4 px-5 bg-zinc-900/30 backdrop-blur-sm border-zinc-800/50 hover:bg-zinc-900/50 hover:border-zinc-700 rounded-xl transition-all duration-300 ${
                    activeCategory === category.name ? "border-crimson/50 bg-crimson/5" : ""
                  }`}
                >
                  <div
                    className={`p-2 rounded-full bg-black/30 mr-3 ${activeCategory === category.name ? "text-crimson" : "text-crimson"}`}
                  >
                    {category.icon}
                  </div>
                  <span className="text-left font-light text-sm md:text-base">{category.name}</span>
                </Button>
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
