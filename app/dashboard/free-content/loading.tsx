import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Skeleton className="h-8 w-64 bg-zinc-800" />
          <Skeleton className="h-4 w-96 mt-2 bg-zinc-800" />
        </div>
        <Skeleton className="h-10 w-28 bg-zinc-800" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-4">
            <Skeleton className="h-8 w-16 bg-zinc-800" />
            <Skeleton className="h-4 w-24 mt-2 bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Search Skeleton */}
      <Skeleton className="h-10 w-full md:w-96 bg-zinc-800" />

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3">
            <Skeleton className="aspect-video w-full bg-zinc-800 rounded-lg mb-2" />
            <Skeleton className="h-5 w-full bg-zinc-800" />
            <Skeleton className="h-3 w-24 mt-2 bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  )
}
