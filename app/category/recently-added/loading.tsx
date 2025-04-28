"use client"
import DashboardHeader from "@/components/dashboard-header"

export default function Loading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 z-0 premium-gradient"></div>
      <div className="fixed inset-0 z-0 bg-[url('/noise.png')] opacity-[0.03]"></div>

      <DashboardHeader />

      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Back Button Skeleton */}
        <div className="h-8 w-20 bg-white/5 animate-pulse mb-8 rounded"></div>

        {/* Page Title Skeleton */}
        <div className="mb-12">
          <div className="h-10 bg-white/5 animate-pulse mb-2 w-64 rounded"></div>
          <div className="h-6 bg-white/5 animate-pulse w-96 rounded"></div>
        </div>

        {/* Video Grid Skeleton */}
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
      </main>
    </div>
  )
}
