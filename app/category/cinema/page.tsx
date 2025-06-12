"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Film, ChevronLeft, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import VimeoCard from "@/components/vimeo-card"
import { useUserPlan } from "@/hooks/use-user-plan"
import LockedClipCard from "@/components/locked-clip-card"

export default function CinemaPage() {
  const [videos, setVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { showcaseVideos, categoryToShowcaseMap, loading } = useVimeoShowcases()
  const router = useRouter()
  const { isProUser } = useUserPlan()

  useEffect(() => {
    if (!loading) {
      const showcaseName = categoryToShowcaseMap["cinema"] || "Cinema"
      const showcaseVideosArray = showcaseVideos[showcaseName] || []

      // For free users, sort alphabetically
      // For pro users, keep the original order or shuffle
      if (showcaseVideosArray.length > 0) {
        if (isProUser) {
          setVideos(showcaseVideosArray)
        } else {
          const sortedVideos = [...showcaseVideosArray].sort((a, b) => {
            const nameA = a.name?.toLowerCase() || ""
            const nameB = b.name?.toLowerCase() || ""
            return nameA.localeCompare(nameB)
          })
          setVideos(sortedVideos)
        }
      }

      setIsLoading(false)
    }
  }, [loading, showcaseVideos, categoryToShowcaseMap, isProUser])

  // Get the total number of videos and how many are locked for free users
  const totalVideos = videos.length
  const lockedVideos = isProUser ? 0 : Math.max(0, totalVideos - 5)

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mr-4 text-zinc-400 hover:text-white"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl font-light flex items-center">
            <Film className="h-6 w-6 mr-2 text-crimson" />
            Cinema
          </h1>
        </div>

        {/* Free user banner */}
        {!isProUser && totalVideos > 5 && (
          <div className="mb-8 bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-crimson mr-2" />
              <p className="text-zinc-300">
                Free users can view 5 of {totalVideos} videos in this category.{" "}
                <span className="text-crimson">{lockedVideos} videos are locked.</span>
              </p>
            </div>
            <Button onClick={() => router.push("/pricing")} className="bg-crimson hover:bg-crimson/90 text-white">
              Upgrade to Pro
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="aspect-[9/16] bg-zinc-900/50 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : videos.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            {videos.map((video, index) => {
              // For free users, only show the first 5 videos
              if (!isProUser && index >= 5) {
                // Get the thumbnail URL from the video
                const thumbnailUrl = video.pictures?.sizes?.[3]?.link || ""
                return <LockedClipCard key={`locked-${index}`} thumbnailUrl={thumbnailUrl} />
              }

              return (
                <motion.div
                  key={video.uri}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <VimeoCard video={video} />
                </motion.div>
              )
            })}
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <p className="text-zinc-400">No videos found in the Cinema category.</p>
          </div>
        )}
      </div>
    </div>
  )
}
