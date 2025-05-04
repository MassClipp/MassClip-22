"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import DashboardHeader from "@/components/dashboard-header"
import { useVimeoVideos } from "@/hooks/use-vimeo-videos"
import { getRecentlyAddedVideos, getRelativeTimeString } from "@/lib/date-utils"
import VimeoCard from "@/components/vimeo-card"

export default function RecentlyAddedPage() {
  const router = useRouter()
  const { videos, loading } = useVimeoVideos()
  const [recentVideos, setRecentVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && videos.length > 0) {
      // For demonstration, add random dates to videos
      const videosWithDates = videos.map((video) => {
        const daysAgo = Math.floor(Math.random() * 60) // 0 to 59 days ago
        const date = new Date()
        date.setDate(date.getDate() - daysAgo)

        return {
          ...video,
          dateAdded: date,
        }
      })

      // Filter for videos added in the last 30 days
      const recent = getRecentlyAddedVideos(videosWithDates)
      setRecentVideos(recent)
      setIsLoading(false)
    } else if (!loading) {
      setIsLoading(false)
    }
  }, [videos, loading])

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
      },
    },
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 premium-gradient">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
      </div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10 px-6">
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-6 text-zinc-400 hover:text-white hover:bg-zinc-900/50 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-zinc-900/50 rounded-sm flex items-center justify-center mr-4">
              <Clock className="h-5 w-5 text-crimson" />
            </div>
            <h1 className="text-3xl font-light tracking-tight text-white">Recently Added</h1>
          </div>

          <p className="text-zinc-400 max-w-2xl">
            Videos added in the last 30 days. Check back regularly for new content.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="aspect-[9/16] rounded-md bg-zinc-900/50 animate-pulse"></div>
            ))}
          </div>
        ) : recentVideos.length > 0 ? (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {recentVideos.map((video, index) => (
              <motion.div key={`video-${video.uri || index}`} variants={itemVariants} className="group">
                <div className="relative">
                  <VimeoCard video={video} />
                  {video.dateAdded && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {getRelativeTimeString(video.dateAdded)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <Clock className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-light text-zinc-400 mb-2">No Recent Videos</h3>
            <p className="text-zinc-500 max-w-md mx-auto">
              There are no videos added in the last 30 days. Check back later for new content.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
