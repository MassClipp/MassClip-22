"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Search, Filter } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"
import { Button } from "@/components/ui/button"
import VideoSkeleton from "@/components/video-skeleton"
import { useVimeoVideos } from "@/hooks/use-vimeo-videos"
import { getCategoryLabel } from "@/lib/category-constants"

export default function NichePage() {
  const params = useParams()
  const router = useRouter()
  const nicheId = params.niche as string
  const [isLoading, setIsLoading] = useState(true)
  const [videos, setVideos] = useState<any[]>([])
  const [filteredVideos, setFilteredVideos] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const { videosByTag, loading } = useVimeoVideos()

  // Get the category label
  const categoryLabel = getCategoryLabel(nicheId)

  // Get videos for this niche
  useEffect(() => {
    if (!loading && videosByTag) {
      const nicheVideos = videosByTag[nicheId.toLowerCase()] || []
      setVideos(nicheVideos)
      setFilteredVideos(nicheVideos)
      setIsLoading(false)
    }
  }, [nicheId, videosByTag, loading])

  // Filter videos based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredVideos(videos)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = videos.filter(
        (video) =>
          video.name?.toLowerCase().includes(query) ||
          video.description?.toLowerCase().includes(query) ||
          video.tags?.some((tag: any) => tag.name.toLowerCase().includes(query)),
      )
      setFilteredVideos(filtered)
    }
  }, [searchQuery, videos])

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="container mx-auto px-4 sm:px-6"
        >
          {/* Header with back button and title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center">
              <Link
                href="/dashboard/niches"
                className="mr-4 p-2 rounded-full bg-gray-900/80 hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              </Link>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                {categoryLabel}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <AnimatePresence>
                {showSearch && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    <input
                      type="text"
                      placeholder="Search in this category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-gray-900/80 border border-gray-800 rounded-lg py-2 px-4 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 w-full"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                variant="outline"
                size="sm"
                className="border-gray-800 bg-gray-900/80 hover:bg-gray-800 text-gray-300"
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="h-4 w-4 mr-2" />
                {!showSearch && "Search"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="border-gray-800 bg-gray-900/80 hover:bg-gray-800 text-gray-300"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="py-10">
              <div className="w-8 h-8 border-t-2 border-red-500 border-solid rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-gray-400 text-center mb-8">Loading videos for {categoryLabel}...</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {Array.from({ length: 12 }).map((_, index) => (
                  <VideoSkeleton key={`skeleton-${index}`} />
                ))}
              </div>
            </div>
          )}

          {/* Videos grid */}
          {!isLoading && (
            <>
              {filteredVideos.length > 0 ? (
                <>
                  {searchQuery && (
                    <div className="mb-6 text-sm text-gray-400">
                      Found {filteredVideos.length} results for "{searchQuery}"
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {filteredVideos.map((video, index) => (
                      <motion.div
                        key={video.uri}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 1) }}
                      >
                        <VimeoCard video={video} />
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
                  <div className="max-w-md mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-3">{categoryLabel} Collection</h2>
                    <p className="text-gray-400 mb-8">
                      No videos found in this category. Try browsing other categories or check back later.
                    </p>
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => router.push("/dashboard/niches")}
                    >
                      Browse Categories
                    </Button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  )
}
