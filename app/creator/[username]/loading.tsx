export default function CreatorProfileLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header Loading State */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-10">
          {/* Profile Picture Loading */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-zinc-800 animate-pulse"></div>

          {/* Profile Info Loading */}
          <div className="flex-1 text-center md:text-left">
            <div className="h-8 bg-zinc-800 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-zinc-800 rounded w-32 mb-4 animate-pulse"></div>

            <div className="h-16 bg-zinc-800 rounded max-w-2xl mb-4 animate-pulse"></div>

            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <div className="h-8 bg-zinc-800 rounded-full w-24 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Content Tabs Loading */}
        <div className="mb-8">
          <div className="flex border-b border-zinc-800">
            <div className="h-10 bg-zinc-800 rounded w-24 animate-pulse mr-4"></div>
            <div className="h-10 bg-zinc-800 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        {/* Content Display Loading */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[9/16] bg-zinc-800 rounded-lg mb-2"></div>
              <div className="h-4 bg-zinc-800 rounded w-3/4 mb-1"></div>
              <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
