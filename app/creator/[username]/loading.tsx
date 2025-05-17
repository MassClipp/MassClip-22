export default function CreatorLoading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Cover image skeleton */}
      <div className="relative h-48 md:h-64 lg:h-80 w-full bg-gray-900"></div>

      {/* Profile header skeleton */}
      <div className="max-w-6xl mx-auto px-4 -mt-24 md:-mt-32 relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* Profile image skeleton */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-800 animate-pulse"></div>

          {/* Name skeleton */}
          <div className="mt-4 h-8 bg-gray-800 rounded w-48 animate-pulse"></div>

          {/* Username skeleton */}
          <div className="mt-2 h-4 bg-gray-800 rounded w-32 animate-pulse"></div>

          {/* Bio skeleton */}
          <div className="mt-4 h-4 bg-gray-800 rounded w-64 animate-pulse"></div>
          <div className="mt-2 h-4 bg-gray-800 rounded w-80 animate-pulse"></div>

          {/* Stats skeleton */}
          <div className="mt-6 flex justify-center gap-8">
            <div className="text-center">
              <div className="h-6 bg-gray-800 rounded w-12 animate-pulse"></div>
              <div className="mt-1 h-4 bg-gray-800 rounded w-10 animate-pulse"></div>
            </div>
            <div className="text-center">
              <div className="h-6 bg-gray-800 rounded w-12 animate-pulse"></div>
              <div className="mt-1 h-4 bg-gray-800 rounded w-10 animate-pulse"></div>
            </div>
            <div className="text-center">
              <div className="h-6 bg-gray-800 rounded w-12 animate-pulse"></div>
              <div className="mt-1 h-4 bg-gray-800 rounded w-10 animate-pulse"></div>
            </div>
          </div>

          {/* Action buttons skeleton */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <div className="h-10 bg-gray-800 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-800 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="mt-12">
          <div className="max-w-md mx-auto h-10 bg-gray-800 rounded animate-pulse"></div>

          {/* Content skeleton */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[9/16] bg-gray-800 rounded-lg"></div>
                <div className="h-4 bg-gray-800 rounded mt-2 w-3/4"></div>
                <div className="h-3 bg-gray-800 rounded mt-2 w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
