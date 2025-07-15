import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DebugStripeRealStatusLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-32 bg-gray-700" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-80 bg-gray-700" />
            <Skeleton className="h-4 w-96 bg-gray-700" />
          </div>
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-10 w-40 bg-gray-700" />
            <Skeleton className="h-10 w-48 bg-gray-700" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Status Card Skeleton */}
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 bg-gray-600" />
                <CardTitle className="text-white">
                  <Skeleton className="h-6 w-48 bg-gray-600" />
                </CardTitle>
              </div>
              <Skeleton className="h-4 w-64 bg-gray-600" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Skeleton className="h-16 w-full bg-gray-700" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-gray-600" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-6 w-full bg-gray-600" />
                    <Skeleton className="h-6 w-full bg-gray-600" />
                    <Skeleton className="h-6 w-full bg-gray-600" />
                    <Skeleton className="h-6 w-full bg-gray-600" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Accounts Card Skeleton */}
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 bg-gray-600" />
                <CardTitle className="text-white">
                  <Skeleton className="h-6 w-48 bg-gray-600" />
                </CardTitle>
              </div>
              <Skeleton className="h-4 w-64 bg-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32 bg-gray-600" />
                  <Skeleton className="h-8 w-8 bg-gray-600" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 bg-gray-700/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-48 bg-gray-600" />
                        <Skeleton className="h-5 w-16 bg-gray-600" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-32 bg-gray-600" />
                        <Skeleton className="h-3 w-24 bg-gray-600" />
                        <div className="flex gap-2 mt-2">
                          <Skeleton className="h-5 w-16 bg-gray-600" />
                          <Skeleton className="h-5 w-16 bg-gray-600" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
