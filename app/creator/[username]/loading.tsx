import { Skeleton } from "@/components/ui/skeleton"

export default function CreatorProfileLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center space-y-6">
        {/* Profile header skeleton */}
        <div className="w-full max-w-4xl flex flex-col md:flex-row items-center gap-6 p-6 bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800">
          {/* Profile picture skeleton */}
          <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full" />

          {/* Profile info skeleton */}
          <div className="flex-1 space-y-4 w-full text-center md:text-left">
            <Skeleton className="h-8 w-48 md:w-64 mx-auto md:mx-0" />
            <Skeleton className="h-4 w-full max-w-md mx-auto md:mx-0" />
            <Skeleton className="h-4 w-full max-w-md mx-auto md:mx-0" />
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="w-full max-w-4xl">
          <Skeleton className="h-10 w-full max-w-md mx-auto mb-6" />

          {/* Content skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
                <Skeleton className="w-full aspect-video" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="px-4 pb-4 pt-0">
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
