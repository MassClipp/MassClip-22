import { Skeleton } from "@/components/ui/skeleton"

export default function CreatorProfileLoading() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section Skeleton */}
      <div className="relative h-64 md:h-80 w-full bg-gray-900"></div>

      {/* Profile Header Skeleton */}
      <div className="container mx-auto px-4 -mt-24 relative z-10">
        <div className="flex flex-col items-center">
          {/* Profile Image Skeleton */}
          <Skeleton className="w-36 h-36 md:w-40 md:h-40 rounded-full" />

          {/* Profile Info Skeleton */}
          <div className="mt-4 text-center">
            <Skeleton className="h-10 w-48 mx-auto mb-2" />
            <Skeleton className="h-6 w-32 mx-auto mb-4" />

            {/* Stats Skeleton */}
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex flex-col items-center">
                <Skeleton className="h-6 w-16 mb-1" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex flex-col items-center">
                <Skeleton className="h-6 w-16 mb-1" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex flex-col items-center">
                <Skeleton className="h-6 w-16 mb-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>

            {/* Bio Skeleton */}
            <Skeleton className="h-16 max-w-2xl mx-auto mt-4" />

            {/* Action Buttons Skeleton */}
            <div className="flex justify-center gap-3 mt-6">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>

            {/* Social Links Skeleton */}
            <div className="flex justify-center gap-4 mt-6">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
          </div>
        </div>

        {/* Content Tabs Skeleton */}
        <div className="mt-12 pb-20">
          <div className="max-w-md mx-auto">
            <Skeleton className="h-10 w-full mb-8" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-md overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4">
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
