import { Skeleton } from "@/components/ui/skeleton"

export default function CreatorProfileLoading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Creator Header Skeleton */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
          <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-800" />

          <div className="flex-1 space-y-4 w-full">
            <Skeleton className="h-8 w-48 bg-gray-800" />
            <Skeleton className="h-4 w-32 bg-gray-800" />
            <Skeleton className="h-16 w-full bg-gray-800" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 bg-gray-800" />
              <Skeleton className="h-9 w-24 bg-gray-800" />
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <Skeleton className="h-10 w-full bg-gray-800 mb-6" />

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <Skeleton className="aspect-video w-full bg-gray-800" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4 bg-gray-800" />
                  <Skeleton className="h-4 w-full bg-gray-800" />
                  <Skeleton className="h-4 w-full bg-gray-800" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-9 w-24 bg-gray-800" />
                    <Skeleton className="h-9 w-24 bg-gray-800" />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
