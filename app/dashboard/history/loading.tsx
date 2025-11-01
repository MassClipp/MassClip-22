import DashboardHeader from "@/components/dashboard-header"
import VideoSkeletonCard from "@/components/video-skeleton-card"

export default function HistoryLoading() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-black via-black to-gray-900"></div>

      {/* Subtle animated gradient overlay */}
      <div className="fixed inset-0 z-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900 via-transparent to-transparent animate-pulse-slow"></div>

      <DashboardHeader />

      <main className="pt-24 pb-16 relative z-10">
        <div className="px-6 mb-8">
          <div className="h-10 w-48 bg-gray-800/50 rounded-md animate-pulse"></div>
          <div className="h-6 w-64 bg-gray-800/50 rounded-md mt-2 animate-pulse"></div>
        </div>

        {/* Red accent line */}
        <div className="relative px-6 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-red-600 to-transparent w-full"></div>
        </div>

        <div className="px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <VideoSkeletonCard key={`skeleton-${index}`} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
