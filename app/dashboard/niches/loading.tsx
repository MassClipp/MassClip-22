export default function NichesLoading() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <div className="h-16 border-b border-zinc-800/50 bg-black/80 backdrop-blur-md"></div>

      <main className="pt-20 pb-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-900/50 rounded-md animate-pulse mb-2"></div>
            <div className="h-4 w-96 bg-gray-900/50 rounded-md animate-pulse"></div>
          </div>

          {/* Search Skeleton */}
          <div className="mb-8">
            <div className="h-12 w-full bg-gray-900/50 rounded-lg animate-pulse"></div>
          </div>

          {/* Categories Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl h-40 animate-pulse"></div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
