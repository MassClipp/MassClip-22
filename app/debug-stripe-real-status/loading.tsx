import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DebugStripeRealStatusLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-32 bg-gray-700" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-80 bg-gray-700" />
            <Skeleton className="h-4 w-96 bg-gray-700" />
          </div>
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-10 w-32 bg-gray-700" />
            <Skeleton className="h-10 w-40 bg-gray-700" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Status Card */}
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-48 bg-gray-700" />
              <Skeleton className="h-4 w-64 bg-gray-700" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full bg-gray-700" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-gray-700" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-8 w-full bg-gray-700" />
                  <Skeleton className="h-8 w-full bg-gray-700" />
                  <Skeleton className="h-8 w-full bg-gray-700" />
                  <Skeleton className="h-8 w-full bg-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Tool */}
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-6 w-32 bg-gray-700" />
              <Skeleton className="h-4 w-48 bg-gray-700" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full bg-gray-700" />
              <Skeleton className="h-10 w-full bg-gray-700" />
            </CardContent>
          </Card>
        </div>

        {/* All Accounts Card */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-gray-700" />
            <Skeleton className="h-4 w-64 bg-gray-700" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48 bg-gray-700" />
                <Skeleton className="h-8 w-8 bg-gray-700" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full bg-gray-700" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
