"use client"

import { useState, useEffect } from "react"
import { useVimeoVideos } from "@/hooks/use-vimeo-videos"
import VimeoCard from "@/components/vimeo-card"
import { Button } from "@/components/ui/button"
import { Clock, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useUserPlan } from "@/hooks/use-user-plan"
import UpgradePrompt from "@/components/upgrade-prompt"

export default function RecentlyAddedPage() {
  const { videos, loading, error } = useVimeoVideos()
  const [sortedVideos, setSortedVideos] = useState<any[]>([])
  const [visibleCount, setVisibleCount] = useState(18)
  const router = useRouter()
  const { isProUser } = useUserPlan()

  useEffect(() => {
    if (videos && videos.length > 0) {
      // Sort videos by upload date (newest first)
      const sorted = [...videos].sort((a, b) => {
        const dateA = new Date(a.created_time).getTime()
        const dateB = new Date(b.created_time).getTime()
        return dateB - dateA
      })
      setSortedVideos(sorted)
    }
  }, [videos])

  // If user is not pro, redirect to pricing page
  useEffect(() => {
    if (!isProUser) {
      // We'll show the upgrade prompt instead of redirecting
      // This gives a better user experience
    }
  }, [isProUser, router])

  const loadMore = () => {
    setVisibleCount((prev) => prev + 18)
  }

  if (!isProUser) {
    return (
      <div className="min-h-screen bg-black text-white pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-8">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="mr-4 text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-light tracking-tight text-white flex items-center">
              <Clock className="h-6 w-6 mr-2 text-crimson" />
              Recently Added
            </h1>
          </div>

          <UpgradePrompt
            title="Recently Added is a Pro Feature"
            description="Upgrade to Creator Pro to access the most recent content as soon as it's available."
            buttonText="Upgrade to Creator Pro"
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-8">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="mr-4 text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-light tracking-tight text-white flex items-center">
              <Clock className="h-6 w-6 mr-2 text-crimson" />
              Recently Added
            </h1>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="aspect-[9/16] bg-zinc-900/50 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-8">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="mr-4 text-zinc-400 hover:text-white hover:bg-zinc-900/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-light tracking-tight text-white flex items-center">
              <Clock className="h-6 w-6 mr-2 text-crimson" />
              Recently Added
            </h1>
          </div>

          <div className="text-center py-12">
            <p className="text-red-500">Error loading videos: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mr-4 text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-light tracking-tight text-white flex items-center">
            <Clock className="h-6 w-6 mr-2 text-crimson" />
            Recently Added
          </h1>
        </div>

        {sortedVideos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400">No videos found.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {sortedVideos.slice(0, visibleCount).map((video) => (
                <VimeoCard key={video.uri} video={video} />
              ))}
            </div>

            {visibleCount < sortedVideos.length && (
              <div className="flex justify-center mt-8">
                <Button onClick={loadMore} variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
