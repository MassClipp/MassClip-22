export default function CreatorProfileLoading() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cover Image and Profile Section */}
      <div className="relative">
        <div className="h-48 md:h-64 w-full bg-gray-900 animate-pulse"></div>

        <div className="container mx-auto px-4">
          <div className="relative flex flex-col md:flex-row items-start md:items-end -mt-16 md:-mt-20 mb-6">
            {/* Profile Image */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-black bg-gray-800 animate-pulse"></div>

            {/* Creator Info */}
            <div className="mt-4 md:mt-0 md:ml-4 md:mb-2 flex-grow">
              <div className="h-8 bg-gray-800 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-800 rounded w-32 mt-2 animate-pulse"></div>
            </div>

            {/* Share Button */}
            <div className="mt-4 md:mt-0 h-10 w-32 bg-gray-800 rounded-full animate-pulse"></div>
          </div>

          {/* Bio */}
          <div className="mb-6">
            <div className="h-4 bg-gray-800 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-800 rounded w-3/4 mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Free Clips Section */}
        <section className="mb-12">
          <div className="h-8 bg-gray-800 rounded w-48 mb-6 animate-pulse"></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-video bg-gray-700"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Paid Clips Section */}
        <section>
          <div className="h-8 bg-gray-800 rounded w-48 mb-6 animate-pulse"></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-video bg-gray-700"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
