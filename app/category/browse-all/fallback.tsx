import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import VideoSkeleton from "@/components/video-skeleton"

export default function BrowseAllFallback() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <main className="pt-20 pb-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header with back button and title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center">
              <Link
                href="/dashboard/categories"
                className="mr-4 p-2 rounded-full bg-gray-900/80 hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              </Link>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Browse All Videos
              </h1>
            </div>
          </div>

          {/* Loading state */}
          <div className="py-10">
            <div className="w-8 h-8 border-t-2 border-red-500 border-solid rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-gray-400 text-center mb-8">Loading videos...</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {Array.from({ length: 24 }).map((_, index) => (
                <VideoSkeleton key={`skeleton-${index}`} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
