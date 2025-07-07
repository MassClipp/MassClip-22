import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-8 w-24 bg-gray-700" />
          <div>
            <Skeleton className="h-8 w-48 bg-gray-700 mb-2" />
            <Skeleton className="h-4 w-64 bg-gray-700" />
          </div>
        </div>

        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
          <Skeleton className="h-6 w-32 bg-gray-700 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Skeleton className="h-10 bg-gray-700" />
            <Skeleton className="h-10 bg-gray-700" />
          </div>
          <Skeleton className="h-10 w-full bg-gray-700" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
              <Skeleton className="h-8 w-12 bg-gray-700 mb-2 mx-auto" />
              <Skeleton className="h-4 w-20 bg-gray-700 mx-auto" />
            </div>
          ))}
        </div>

        <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
          <Skeleton className="h-6 w-40 bg-gray-700 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                <Skeleton className="h-4 w-full bg-gray-700 mb-2" />
                <Skeleton className="h-3 w-24 bg-gray-700 mb-3" />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Skeleton className="h-3 w-16 bg-gray-700" />
                  <Skeleton className="h-3 w-16 bg-gray-700" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1 bg-gray-700" />
                  <Skeleton className="h-8 flex-1 bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
