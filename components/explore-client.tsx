"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Search, Clock, Brain, Rocket, ChevronRight, TrendingUp, Lock, Film, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { filterCategoriesBySearch } from "@/lib/search-utils"
import { shuffleArray } from "@/lib/utils"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import type { VimeoShowcase, VimeoVideo } from "@/lib/types"
import { InlineVideoRow } from "@/components/inline-video-row"
import { InlineVimeoCard } from "@/components/inline-vimeo-card"

interface ExploreClientProps {
  initialShowcases: VimeoShowcase[]
  initialShowcaseVideos: Record<string, VimeoVideo[]>
  initialVideos: VimeoVideo[]
  initialVideosByTag: Record<string, VimeoVideo[]>
  initialCreatorUploads: any[]
  initialSearchQuery: string
  userId: string | null // Allow null userId for anonymous users
}

export function ExploreClient({
  initialShowcases,
  initialShowcaseVideos,
  initialVideos,
  initialVideosByTag,
  initialCreatorUploads,
  initialSearchQuery,
  userId,
}: ExploreClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filteredShowcaseVideos, setFilteredShowcaseVideos] = useState<Record<string, any[]>>({})
  const [hasSearchResults, setHasSearchResults] = useState(false)
  const [featuredVideos, setFeaturedVideos] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const { isProUser } = useUserPlan()
  const { remainingDownloads, isProUser: isPro, hasReachedLimit } = useDownloadLimit()

  const searchQuery = initialSearchQuery

  const isLoggedIn = userId !== null

  useEffect(() => {
    if (searchQuery) {
      const filteredShowcases = filterCategoriesBySearch(initialShowcaseVideos, searchQuery)

      if (isProUser) {
        const shuffledShowcases: Record<string, any[]> = {}
        Object.entries(filteredShowcases).forEach(([key, videos]) => {
          shuffledShowcases[key] = shuffleArray([...videos], Math.random())
        })
        setFilteredShowcaseVideos(shuffledShowcases)
      } else {
        setFilteredShowcaseVideos(filteredShowcases)
      }

      setHasSearchResults(Object.keys(filteredShowcases).length > 0)
    } else {
      if (isProUser) {
        const shuffledShowcases: Record<string, any[]> = {}
        Object.entries(initialShowcaseVideos || {}).forEach(([key, videos]) => {
          shuffledShowcases[key] = shuffleArray([...videos], Math.random())
        })
        setFilteredShowcaseVideos(shuffledShowcases)
      } else {
        setFilteredShowcaseVideos(initialShowcaseVideos || {})
      }

      setHasSearchResults(Object.keys(initialShowcaseVideos || {}).length > 0)
    }
  }, [searchQuery, initialShowcaseVideos, isProUser])

  useEffect(() => {
    if (initialShowcaseVideos && Object.keys(initialShowcaseVideos).length > 0) {
      const allShowcaseVideos = Object.values(initialShowcaseVideos).flat()
      if (allShowcaseVideos.length > 0) {
        setFeaturedVideos(shuffleArray(allShowcaseVideos, Math.random()).slice(0, 6))
      }
    }
  }, [initialShowcaseVideos])

  const showcaseNames = Object.keys(searchQuery ? filteredShowcaseVideos : initialShowcaseVideos || {})

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
      premium: true,
    },
  ]

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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Explore Content</h1>
          <p className="text-zinc-400 mt-1">Discover amazing content from creators</p>
        </div>

        <div className="flex items-center gap-4">
          {!isLoggedIn ? (
            <Button
              onClick={() => router.push("/login")}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Sign In for More Features
            </Button>
          ) : (
            /* Download Counter */
            !isPro && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  hasReachedLimit
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-zinc-800/50 text-zinc-300 border border-zinc-700/50"
                }`}
              >
                <Download className="h-3 w-3" />
                <span>{remainingDownloads}/15</span>
              </div>
            )
          )}

          {/* Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const query = formData.get("search") as string
              if (query && query.trim()) {
                router.push(`/dashboard/explore?search=${encodeURIComponent(query.trim())}`)
              }
            }}
            className="w-full md:w-96"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
              <input
                type="text"
                name="search"
                placeholder="Search videos..."
                defaultValue={searchQuery}
                className="w-full py-2.5 pl-10 pr-4 bg-zinc-900/60 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Search Results Header */}
      {searchQuery && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
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

      {/* Featured Section */}
      {!searchQuery && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light tracking-tight text-white">
              <span className="text-gradient-accent">Featured</span> Clips
            </h2>
            <Button
              onClick={() => router.push(isProUser ? "/category/browse-all" : "/dashboard/membership")}
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
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {featuredVideos.map((video, index) => (
              <div key={`featured-${video.uri || index}`} className="group">
                <InlineVimeoCard video={video} />
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Category Quick Links */}
      {!searchQuery && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.h3
            variants={itemVariants}
            className="text-xl font-light tracking-tight text-white mb-4 flex items-center"
          >
            <TrendingUp className="h-4 w-4 mr-2 text-zinc-400" />
            Trending Categories
          </motion.h3>

          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {quickCategories.map((category) => {
              if (category.premium && !isProUser) {
                return (
                  <Button
                    key={category.name}
                    onClick={() => router.push("/dashboard/membership")}
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
                    className={`p-2 rounded-full bg-black/30 mr-3 ${activeCategory === category.name ? "text-crimson" : "text-crimson"}`}
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

      {/* Creator Uploads Row */}
      {initialCreatorUploads && initialCreatorUploads.length > 0 && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants}>
            <InlineVideoRow title="Creator Uploads" videos={initialCreatorUploads} limit={20} isCreatorUploads={true} />
          </motion.div>
        </motion.div>
      )}

      {/* Showcase-based categories */}
      {showcaseNames.length > 0 && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-12">
          {showcaseNames.map((showcaseName) => {
            const videosToShow = searchQuery
              ? filteredShowcaseVideos[showcaseName]
              : (initialShowcaseVideos || {})[showcaseName]
            return (
              <motion.div key={`showcase-${showcaseName}`} variants={itemVariants}>
                <InlineVideoRow title={showcaseName} videos={videosToShow || []} limit={10} isShowcase={true} />
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
