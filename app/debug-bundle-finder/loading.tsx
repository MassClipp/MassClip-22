import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-8 w-32 bg-gray-700" />
          <div>
            <Skeleton className="h-8 w-48 bg-gray-700 mb-2" />
            <Skeleton className="h-4 w-64 bg-gray-700" />
          </div>
        </div>

        <div className="space-y-6">
          <Skeleton className="h-32 w-full bg-gray-800/50" />
          <Skeleton className="h-48 w-full bg-gray-800/50" />
          <Skeleton className="h-64 w-full bg-gray-800/50" />
        </div>
      </div>
    </div>
  )
}
