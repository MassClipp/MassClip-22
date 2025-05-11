"use client"

import { useRef, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Search, Clock, Brain, Rocket, ChevronRight, TrendingUp } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useClips } from "@/hooks/use-clips"
import { ClipsDisplay } from "@/components/clips-display"
import { shuffleArray } from "@/lib/utils"
import ClipPlayer from "@/components/ClipPlayer"

export default function Dashboard() {
  // Get search query from URL
  const searchParams = useSearchParams()
  const searchQuery = searchParams?.get("search") || ""

  // State for active category
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [featuredClips, setFeaturedClips] = useState<any[]>([])

  // Fetch clips from Firebase
  const { clips, categories, loading, error } = useClips()

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

  // Prepare featured clips
  useEffect(() => {
    if (!loading && clips.length > 0) {
      // Shuffle and take the first 6 for featured section
      setFeaturedClips(shuffleArray([...clips]).slice(0, 6))
    }
  }, [clips, loading])

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

  // Quick category navigation
  const quickCategories = [
    { name: "Introspection", icon: <Brain className="h-4 w-4 md:h-5 md:w-5" />, href: "/category/introspection" },
    { name: "Hustle", icon: <Rocket className="h-4 w-4 md:h-5 md:w-5" />, href: "/category/hustle-mentality" },
    { name: "Recent", icon: <Clock className="h-4 w-4 md:h-5 md:w-5" />, href: "/category/recently-added" },
    { name: "All", icon: <Search className="h-4 w-4 md:h-5 md:w-5" />, href: "/dashboard/categories" },
  ]

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
                {clips.length > 0
                  ? `Found ${clips.length} clips matching your search`
                  : "No results found. Try a different search term."}
              </p>
            </div>
          </motion.div>
        )}

        {/* Featured Section (if not searching) */}
        {!searchQuery && !loading && featuredClips.length > 0 && (
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
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading
                ? // Skeleton loaders
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="aspect-video rounded-xl bg-zinc-900/50 animate-pulse"
                    ></div>
                  ))
                : // Featured clips
                  featuredClips.map((clip) => (
                    <div key={clip.id} className="group space-y-3">
                      <div className="relative overflow-hidden rounded-xl">
                        <ClipPlayer src={clip.url} />
                      </div>
                      <h3 className="text-lg font-medium text-white">{clip.title}</h3>
                      <p className="text-sm text-zinc-400">{clip.category}</p>
                    </div>
                  ))}
            </motion.div>
          </motion.div>
        )}

        {/* Category Quick Links (if not searching) */}
        {!searchQuery && !loading && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-6 mb-12">
            <motion.h3
              variants={itemVariants}
              className="text-xl font-light tracking-tight text-white mb-4 flex items-center"
            >
              <TrendingUp className="h-4 w-4 mr-2 text-zinc-400" />
              Trending Categories
            </motion.h3>

            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickCategories.map((category) => (
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
            <p className="text-red-500">Error loading clips: {error}</p>
          </div>
        )}

        {/* Loading state (initial) */}
        {loading && (
          <div className="px-6 py-10">
            <div className="h-8 w-48 bg-zinc-900/50 rounded-md animate-pulse mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="aspect-video rounded-xl bg-zinc-900/50 animate-pulse"></div>
              ))}
            </div>
          </div>
        )}

        {/* Main clips display */}
        {!loading && clips.length > 0 && (
          <div className="px-6">
            <ClipsDisplay clips={clips} searchQuery={searchQuery} groupByCategory={true} />
          </div>
        )}

        {/* No clips state */}
        {!loading && clips.length === 0 && !error && (
          <div className="px-6 py-10 text-center">
            {searchQuery ? (
              <p className="text-zinc-400">No clips found matching "{searchQuery}". Try a different search term.</p>
            ) : (
              <p className="text-zinc-400">
                No clips found. Add some clips to your Firebase collection to get started.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
