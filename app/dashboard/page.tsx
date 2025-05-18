"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Search, Clock, Brain, Rocket, ChevronRight, TrendingUp, Lock, Film } from "lucide-react"
import VideoRow from "@/components/video-row"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { useVimeoVideos } from "@/hooks/use-vimeo-videos"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { filterCategoriesBySearch } from "@/lib/search-utils"
import VimeoCard from "@/components/vimeo-card"
import { shuffleArray } from "@/lib/utils"
import { useUserPlan } from "@/hooks/use-user-plan"

export default function Dashboard() {
  // Get search query from URL
  const searchParams = useSearchParams()
  const searchQuery = searchParams?.get("search") || ""

  // State to store the filtered videos
  const [filteredShowcaseVideos, setFilteredShowcaseVideos] = useState<Record<string, any[]>>({})
  const [hasSearchResults, setHasSearchResults] = useState(false)
  const [featuredVideos, setFeaturedVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchInputValue, setSearchInputValue] = useState(searchQuery)

  // Get user plan
  const { isProUser } = useUserPlan()

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

      // For pro users, shuffle each category's videos
      if (isProUser) {
        const shuffledShowcases: Record<string, any[]> = {}
        Object.entries(filteredShowcases).forEach(([key, videos]) => {
          shuffledShowcases[key] = shuffleArray([...videos], Math.random())
        })
        setFilteredShowcaseVideos(shuffledShowcases)
      } else {
        setFilteredShowcaseVideos(filteredShowcases)
      }

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
      if (isProUser) {
        // For pro users, shuffle each category's videos
        const shuffledShowcases: Record<string, any[]> = {}
        Object.entries(showcaseVideos).forEach(([key, videos]) => {
          shuffledShowcases[key] = shuffleArray([...videos], Math.random())
        })
        setFilteredShowcaseVideos(shuffledShowcases)
      } else {
        setFilteredShowcaseVideos(showcaseVideos)
      }

      setHasSearchResults(Object.keys(showcaseVideos).length > 0)
    }
  }, [searchQuery, showcaseVideos, loadingShowcases, loadingVideos, videosByTag, videos, isProUser])

  // Get showcase names based on whether we're searching or not
  const showcaseNames = Object.keys(searchQuery ? filteredShowcaseVideos : showcaseVideos)

  // Prepare featured videos from all showcases
  useEffect(() => {
    if (!loadingShowcases && !loadingVideos && Object.keys(showcaseVideos).length > 0) {
      // Collect videos from all showcases (not all videos from account)
      const allShowcaseVideos = Object.values(showcaseVideos).flat()

      // Both free and pro users get shuffled videos in the featured section
      // But use a different random seed each time for maximum randomness
      if (allShowcaseVideos.length > 0) {
        setFeaturedVideos(shuffleArray(allShowcaseVideos, Math.random()).slice(0, 6))
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
  const hasMindset = showcaseNames.some(
    (name) =>
      name.toLowerCase().includes("mindset") ||
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

  const hasCinema = showcaseNames.some(
    (name) => name.toLowerCase().includes("cinema") || name.toLowerCase().includes("film"),
  )

  // Quick category navigation
  const quickCategories = [
    {
      name: "Mindset",
      icon: <Brain className="h-4 w-4 md:h-5 md:w-5" />,
      href: "/category/mindset",
      premium: false,
    },
    {
      name: "Hustle",
      icon: <Rocket className="h-4 w-4 md:h-5 md:w-5" />,
      href: "/category/hustle-mentality",
      premium: false,
    },
    {
      name: "Cinema",
      icon: <Film className="h-4 w-4 md:h-5 md:w-5" />,
      href: "/category/cinema",
      premium: false,
    },
    {
      name: "Recent",
      icon: <Clock className="h-4 w-4 md:h-5 md:w-5" />,
      href: "/category/recently-added",
      premium: true, // Mark this as premium
    },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInputValue.trim()) {
      // Save the search query to localStorage for potential use in other components
      localStorage.setItem("lastSearchQuery", searchInputValue)
      router.push(`/dashboard?search=${encodeURIComponent(searchInputValue)}`)
    }
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

      <div className="relative z-10">
        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="relative max-w-md">
            <input
              type="text"
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              placeholder="Search for clips..."
              className="w-full bg-zinc-900/50 border border-zinc-800 text-white px-4 py-2 pl-10 rounded-md focus:outline-none focus:ring-1 focus:ring-crimson"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <button
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Search Results Header (if searching) */}
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
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
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="mb-12">
            <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-extralight tracking-tight text-white">
                <span className="text-gradient-accent">Featured</span> Clips
              </h1>
              <Button
                onClick={() => router.push(isProUser ? "/category/browse-all" : "/pricing")}
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-900/50 rounded-full px-4 py-2 transition-all duration-300"
              >
                {isProUser ? (
                  <>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Upgrade <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
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
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="mb-12">
            <motion.h3
              variants={itemVariants}
              className="text-xl font-light tracking-tight text-white mb-4 flex items-center"
            >
              <TrendingUp className="h-4 w-4 mr-2 text-zinc-400" />
              Trending Categories
            </motion.h3>

            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickCategories.map((category, index) => {
                // If category is premium and user is not pro, show locked version
                if (category.premium && !isProUser) {
                  return (
                    <Button
                      key={category.name}
                      onClick={() => router.push("/pricing")}
                      variant="outline"
                      className="flex items-center justify-start h-auto py-4 px-5 bg-zinc-900/30 backdrop-blur-sm border-zinc-800/50 hover:bg-zinc-900/50 hover:border-zinc-700 rounded-xl transition-all duration-300"
                    >
                      <div className="p-2 rounded-full bg-black/30 mr-3 text-crimson">
                        <Lock className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <div className="text-left">
                        <span className="font-light text-sm md:text-base">{category.name}</span>
                        <span className="block text-xs text-zinc-500">Pro Only</span>
                      </div>
                    </Button>
                  )
                }

                // Otherwise show normal category button
                return (
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
                      className={`p-2 rounded-full bg-black/30 mr-3 ${
                        activeCategory === category.name ? "text-crimson" : "text-crimson"
                      }`}
                    >
                      {category.icon}
                    </div>
                    <span className="text-left font-light text-sm md:text-base">{category.name}</span>
                  </Button>
                )
              })}
            </motion.div>
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <div className="py-10 text-center">
            <p className="text-red-500">Error loading videos: {error}</p>
          </div>
        )}

        {/* Loading state (initial) */}
        {isLoadingData && (
          <div className="py-10">
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
          <div className="py-10 text-center">
            {searchQuery ? (
              <p className="text-zinc-400">No videos found matching "{searchQuery}". Try a different search term.</p>
            ) : (
              <p className="text-zinc-400">
                No videos found. Make sure your Vimeo account has videos and your API credentials are correct.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
