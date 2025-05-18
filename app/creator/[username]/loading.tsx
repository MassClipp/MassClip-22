import { Skeleton } from "@/components/ui/skeleton"

export default function CreatorProfileLoading() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-black pt-8 pb-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div>
                <Skeleton className="h-7 w-40 mb-2" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-5 w-full max-w-md mt-4" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-full mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <Skeleton className="w-full aspect-video" />
                <div className="p-4">
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
