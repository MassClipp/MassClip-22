export default function CreatorProfileLoading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero section */}
      <div className="relative h-48 md:h-64 w-full bg-gradient-to-r from-gray-900 to-black"></div>

      {/* Profile content */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Profile image skeleton */}
          <div className="w-32 h-32 rounded-full bg-gray-800 animate-pulse"></div>

          {/* Profile details skeleton */}
          <div className="flex-1 mt-4 md:mt-0">
            <div className="h-8 bg-gray-800 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-800 rounded w-32 mt-2 animate-pulse"></div>
            <div className="h-4 bg-gray-800 rounded w-48 mt-4 animate-pulse"></div>
            <div className="h-4 bg-gray-800 rounded w-full mt-4 animate-pulse"></div>
            <div className="h-4 bg-gray-800 rounded w-3/4 mt-2 animate-pulse"></div>
          </div>
        </div>

        {/* Content tabs skeleton */}
        <div className="mt-12">
          <div className="h-10 bg-gray-800 rounded max-w-md mx-auto animate-pulse"></div>

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
