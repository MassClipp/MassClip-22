"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Search, Zap, Clock, Grid3X3 } from "lucide-react"
import Link from "next/link"
import { categories } from "@/lib/data"
import { getRecentlyAddedVideos } from "@/lib/date-utils"
import DashboardHeader from "@/components/dashboard-header"
import VideoRow from "@/components/video-row"

export default function Dashboard() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams?.get("search") || ""
  const [query, setQuery] = useState(searchQuery)
  const [recentlyAddedVideos, setRecentlyAddedVideos] = useState<any[]>([])

  // Get all videos from all categories
  const allVideos = categories.flatMap((category) => category.videos)

  // Filter for recently added videos (past 30 days)
  useEffect(() => {
    // For demonstration, we'll add random dateAdded properties to some videos
    const videosWithDates = allVideos.map((video) => {
      // Randomly assign dates to videos - in a real app, these would come from your database
      const daysAgo = Math.floor(Math.random() * 60) // 0 to 59 days ago
      const date = new Date()
      date.setDate(date.getDate() - daysAgo)

      return {
        ...video,
        dateAdded: date,
      }
    })

    const recent = getRecentlyAddedVideos(videosWithDates)
    setRecentlyAddedVideos(recent)
  }, [])

  return (
    <div className="min-h-screen bg-black">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 z-0 premium-gradient"></div>
      <div className="fixed inset-0 z-0 bg-[url('/noise.png')] opacity-[0.03]"></div>

      <DashboardHeader />

      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white/30" size={20} />
            <input
              type="text"
              placeholder="Find your next viral post..."
              className="w-full py-4 pl-14 pr-4 bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-crimson focus:ring-1 focus:ring-crimson transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Browse Categories Section */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-light text-white mb-6">Browse Categories</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Motivation Category */}
            <Link href="/category/motivation">
              <motion.div
                className="premium-card p-6 flex items-center cursor-pointer hover:bg-white/5 transition-all"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-10 h-10 bg-white/5 rounded-sm flex items-center justify-center mr-4">
                  <Zap className="h-5 w-5 text-crimson" />
                </div>
                <span className="text-white text-lg">Motivation</span>
              </motion.div>
            </Link>

            {/* Recently Added Category */}
            <Link href="/category/recently-added">
              <motion.div
                className="premium-card p-6 flex items-center cursor-pointer hover:bg-white/5 transition-all"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-10 h-10 bg-white/5 rounded-sm flex items-center justify-center mr-4">
                  <Clock className="h-5 w-5 text-crimson" />
                </div>
                <span className="text-white text-lg">Recently Added</span>
              </motion.div>
            </Link>

            {/* All Categories */}
            <Link href="/category/browse-all">
              <motion.div
                className="premium-card p-6 flex items-center cursor-pointer hover:bg-white/5 transition-all"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-10 h-10 bg-white/5 rounded-sm flex items-center justify-center mr-4">
                  <Grid3X3 className="h-5 w-5 text-crimson" />
                </div>
                <span className="text-white text-lg">All Categories</span>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* Display categories and their videos */}
        {categories.map((category, index) => (
          <VideoRow key={category.id} title={category.name} videos={category.videos} delay={index * 0.1} />
        ))}

        {/* Recently Added Videos Section */}
        {recentlyAddedVideos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-16"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-light text-white">Recently Added</h2>
              <Link href="/category/recently-added" className="text-crimson hover:text-crimson-light transition-colors">
                See all
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentlyAddedVideos.slice(0, 4).map((video) => (
                <motion.div
                  key={video.id}
                  className="premium-card overflow-hidden group cursor-pointer"
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="aspect-video bg-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                    <img
                      src={video.thumbnail || "/placeholder.svg"}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-white text-lg mb-1 group-hover:text-crimson transition-colors duration-300">
                      {video.title}
                    </h3>
                    <p className="text-white/50 text-sm">{video.duration}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
