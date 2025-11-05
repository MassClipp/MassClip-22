export default function ExploreLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="h-8 w-48 bg-zinc-900/50 rounded-md animate-pulse mb-2"></div>
          <div className="h-5 w-64 bg-zinc-900/50 rounded-md animate-pulse"></div>
        </div>
        <div className="w-full md:w-96 h-11 bg-zinc-900/50 rounded-lg animate-pulse"></div>
      </div>

      {/* Featured section skeleton */}
      <div>
        <div className="h-7 w-32 bg-zinc-900/50 rounded-md animate-pulse mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="aspect-[9/16] rounded-xl bg-zinc-900/50 animate-pulse"></div>
          ))}
        </div>
      </div>

      {/* Categories skeleton */}
      <div>
        <div className="h-6 w-40 bg-zinc-900/50 rounded-md animate-pulse mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`cat-skeleton-${index}`} className="h-20 bg-zinc-900/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
