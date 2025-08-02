import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DebugPurchaseFlowLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-12 w-96 mb-2 bg-gray-700" />
          <Skeleton className="h-6 w-[600px] bg-gray-700" />
        </div>

        {/* Controls Skeleton */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-48 bg-gray-700" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-gray-700" />
                <Skeleton className="h-10 w-full bg-gray-700" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 bg-gray-700" />
                <Skeleton className="h-10 w-full bg-gray-700" />
              </div>
            </div>
            <Skeleton className="h-10 w-full bg-gray-700" />
          </CardContent>
        </Card>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2 bg-gray-700" />
                <Skeleton className="h-3 w-20 mb-1 bg-gray-700" />
                <Skeleton className="h-3 w-16 bg-gray-700" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Steps Skeleton */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-48 bg-gray-700" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-700 rounded">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 bg-gray-700" />
                  <Skeleton className="h-4 w-4 bg-gray-700" />
                  <Skeleton className="h-4 w-48 bg-gray-700" />
                  <Skeleton className="h-5 w-16 bg-gray-700" />
                </div>
                <Skeleton className="h-4 w-4 bg-gray-700" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
