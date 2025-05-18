import { Skeleton } from "@/components/ui/skeleton"

export default function CreatorProfileLoading() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Creator Header Loading State */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
          <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-800" />

          <div className="flex-1 text-center md:text-left space-y-4 w-full">
            <Skeleton className="h-8 w-48 bg-gray-800" />
            <Skeleton className="h-4 w-32 bg-gray-800" />
            <Skeleton className="h-16 w-full bg-gray-800" />
          </div>

          <Skeleton className="h-10 w-24 bg-gray-800" />
        </div>

        {/* Tabs Loading State */}
        <div className="w-full">
          <Skeleton className="h-10 w-full bg-gray-800 mb-6" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-48 w-full bg-gray-800" />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
