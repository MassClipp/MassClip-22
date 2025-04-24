"use client"

import { useRef, useEffect } from "react"
import DashboardHeader from "@/components/dashboard-header"
import VideoRow from "@/components/video-row"
import BorderLine from "@/components/border-line"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function Dashboard() {
  // Fetch showcase-based videos only
  const { showcaseVideos, showcaseIds, loading: loadingShowcases, error: showcaseError } = useVimeoShowcases()
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

  // Get showcase names
  const showcaseNames = Object.keys(showcaseVideos)

  // Check if we're still loading initial data
  const isLoading = loadingShowcases && showcaseNames.length === 0

  // Check for errors
  const error = showcaseError

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        {/* Browse All Banner */}
        <div className="px-6 mb-8">
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-6 flex flex-col md:flex-row justify-between items-center">
            <div>
              <h2 className="text-2xl font-light tracking-wider text-white mb-2">Browse All Content</h2>
              <p className="text-gray-400 mb-4 md:mb-0">Explore our complete collection of clips</p>
            </div>
            <Button
              onClick={() => router.push("/category/browse-all")}
              className="bg-crimson hover:bg-crimson-dark text-white"
            >
              View All Clips
            </Button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="px-6 py-10 text-center">
            <p className="text-red-500">Error loading videos: {error}</p>
          </div>
        )}

        {/* Loading state (initial) */}
        {isLoading && (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-400">Loading videos...</p>
          </div>
        )}

        {/* Showcase-based categories */}
        {showcaseNames.length > 0 && (
          <>
            {showcaseNames.map((showcaseName, index) => (
              <div key={`showcase-${showcaseName}`}>
                <VideoRow
                  title={showcaseName}
                  videos={showcaseVideos[showcaseName]}
                  limit={6}
                  isShowcase={true}
                  showcaseId={showcaseIds[showcaseName]}
                />
                {index < showcaseNames.length - 1 && <BorderLine className="my-2" />}
              </div>
            ))}
          </>
        )}

        {/* No videos state */}
        {!isLoading && showcaseNames.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-400">
              No videos found. Make sure your Vimeo account has videos and your API credentials are correct.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
