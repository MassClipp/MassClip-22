export default function NicheCategoryLoading() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <div className="h-16 border-b border-zinc-800/50 bg-black/80 backdrop-blur-md"></div>

      <main className="pt-20 pb-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-900/80 mr-4"></div>
              <div className="h-8 w-48 bg-gray-900/50 rounded-md animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-8 bg-gray-900/50 rounded-md animate-pulse"></div>
              <div className="w-24 h-8 bg-gray-900/50 rounded-md animate-pulse"></div>
            </div>
          </div>

          {/* Loading indicator */}
          <div className="py-10">
            <div className="w-8 h-8 border-t-2 border-red-500 border-solid rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-gray-400 text-center mb-8">Loading videos...</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="aspect-[9/16] bg-gray-900/50 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
