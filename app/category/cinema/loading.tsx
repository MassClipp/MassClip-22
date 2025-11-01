import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex items-center mb-8">
          <Skeleton className="h-9 w-20 mr-4 bg-zinc-800/50" />
          <Skeleton className="h-9 w-40 bg-zinc-800/50" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="aspect-[9/16] bg-zinc-900/50 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
