import { Skeleton } from "@/components/ui/skeleton"

export default function CreatorProfileLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center space-y-6">
        {/* Profile header */}
        <div className="w-full max-w-4xl flex flex-col md:flex-row items-center gap-6 p-6 bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800">
          <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full" />

          <div className="flex-1 space-y-4 text-center md:text-left">
            <Skeleton className="h-8 w-48 mx-auto md:mx-0" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-sm" />

            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="w-full max-w-4xl">
          <div className="flex border-b border-zinc-800 mb-6">
            <Skeleton className="h-10 w-24 mr-4" />
            <Skeleton className="h-10 w-24" />
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="w-full aspect-video rounded-lg" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
