export default function UploadsLoading() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-96 bg-zinc-800 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse"></div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-4">
            <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="h-10 w-80 bg-zinc-800 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse"></div>
          <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-4">
            <div className="aspect-square bg-zinc-800 rounded-lg mb-3 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-800 rounded animate-pulse"></div>
              <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse"></div>
              <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
