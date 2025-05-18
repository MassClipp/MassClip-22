export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Profile Header Skeleton */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white/30 animate-pulse"></div>

            <div className="text-center md:text-left">
              <div className="h-8 w-48 bg-white/30 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-white/30 rounded animate-pulse"></div>
              <div className="mt-2 h-16 w-full max-w-2xl bg-white/30 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="p-6">
          <div className="h-10 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-video bg-gray-200 animate-pulse"></div>
                <div className="p-4">
                  <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-3"></div>
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
