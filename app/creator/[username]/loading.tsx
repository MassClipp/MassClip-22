export default function CreatorProfileLoading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero section with cover image */}
      <div className="relative h-48 md:h-64 w-full bg-gray-900 animate-pulse"></div>

      {/* Profile info section */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Profile image */}
          <div className="w-32 h-32 rounded-full bg-gray-800 animate-pulse"></div>

          {/* Profile details */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="h-8 bg-gray-800 rounded w-48 animate-pulse"></div>
                <div className="h-4 bg-gray-800 rounded w-24 mt-2 animate-pulse"></div>
              </div>

              {/* Social links placeholder */}
              <div className="flex gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gray-800 animate-pulse"></div>
                ))}
              </div>
            </div>

            {/* Bio placeholder */}
            <div className="mt-4 h-16 bg-gray-800 rounded animate-pulse"></div>

            {/* Stats placeholder */}
            <div className="mt-6 flex gap-6">
              <div className="text-center">
                <div className="h-6 bg-gray-800 rounded w-12 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gray-800 rounded w-16 mt-1 animate-pulse"></div>
              </div>
              <div className="h-8 bg-gray-800 rounded-full w-32 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Tabs placeholder */}
        <div className="mt-12">
          <div className="h-10 bg-gray-800 rounded max-w-md mx-auto animate-pulse"></div>

          {/* Clips grid placeholder */}
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
