"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { categories } from "@/lib/data"
import { getRecentlyAddedVideos } from "@/lib/date-utils"
import DashboardHeader from "@/components/dashboard-header"

export default function RecentlyAddedPage() {
  const router = useRouter()
  const [recentlyAddedVideos, setRecentlyAddedVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    setLoading(false)
  }, [])

  return (
    <div className="min-h-screen bg-black">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 z-0 premium-gradient"></div>
      <div className="fixed inset-0 z-0 bg-[url('/noise.png')] opacity-[0.03]"></div>

      <DashboardHeader />

      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.button
          onClick={() => router.back()}
          className="flex items-center text-white/70 hover:text-white mb-8 group transition-colors"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:translate-x-[-4px] transition-transform" />
          Back
        </motion.button>

        {/* Page Title */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-3xl font-light text-white">Recently Added</h1>
          <p className="text-white/50 mt-2">Videos added in the last 30 days</p>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div key={item} className="premium-card overflow-hidden">
                <div className="aspect-video bg-white/5 animate-pulse"></div>
                <div className="p-4">
                  <div className="h-6 bg-white/5 animate-pulse mb-2 rounded"></div>
                  <div className="h-4 bg-white/5 animate-pulse w-1/3 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* No Videos State */}
            {recentlyAddedVideos.length === 0 ? (
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <p className="text-white/70 text-lg mb-4">No videos have been added in the last 30 days.</p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="bg-crimson hover:bg-crimson-dark text-white px-6 py-2 transition-colors"
                >
                  Browse All Videos
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recentlyAddedVideos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    className="premium-card overflow-hidden group cursor-pointer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
                    whileHover={{ scale: 1.03 }}
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
                      <div className="flex justify-between">
                        <p className="text-white/50 text-sm">{video.duration}</p>
                        <p className="text-white/50 text-sm">{new Date(video.dateAdded).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
