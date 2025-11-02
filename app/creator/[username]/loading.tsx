import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section with Gradient Overlay */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-zinc-900 to-black opacity-90"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

        {/* Content positioned at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-6xl mx-auto px-4 pb-8 pt-16">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              {/* Profile Picture Skeleton */}
              <Skeleton className="w-28 h-28 md:w-32 md:h-32 rounded-full" />

              {/* Profile Info Skeleton */}
              <div className="flex-1 text-center md:text-left">
                <Skeleton className="h-10 w-48 mb-2" />
                <Skeleton className="h-5 w-24" />
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex gap-3 mt-4 md:mt-0">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bio Skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-2/3">
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-5/6 mb-2" />
            <Skeleton className="h-6 w-4/6" />
          </div>
        </div>
      </div>

      {/* Content Tabs Skeleton */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="border-b border-zinc-800 mb-8">
          <div className="flex gap-8">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-4">
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
