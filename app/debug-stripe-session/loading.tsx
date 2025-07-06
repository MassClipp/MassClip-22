import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DebugStripeSessionLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-9 w-32 bg-gray-700" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-80 bg-gray-700" />
            <Skeleton className="h-4 w-60 bg-gray-700" />
          </div>
          <Skeleton className="h-9 w-32 ml-auto bg-gray-700" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Stripe Configuration Card */}
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 bg-gray-600" />
                  <Skeleton className="h-6 w-48 bg-gray-600" />
                </div>
                <Skeleton className="h-4 w-64 bg-gray-600" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-9 w-32 bg-gray-600" />
                  <Skeleton className="h-6 w-24 bg-gray-600" />
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-20 bg-gray-600" />
                      <Skeleton className="h-4 w-32 bg-gray-600" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Checkout Creation Test Card */}
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 bg-gray-600" />
                  <Skeleton className="h-6 w-48 bg-gray-600" />
                </div>
                <Skeleton className="h-4 w-64 bg-gray-600" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1 bg-gray-600" />
                  <Skeleton className="h-10 w-10 bg-gray-600" />
                </div>
                <Skeleton className="h-10 w-full bg-gray-600" />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Session Debug Card */}
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 bg-gray-600" />
                  <Skeleton className="h-6 w-32 bg-gray-600" />
                </div>
                <Skeleton className="h-4 w-56 bg-gray-600" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1 bg-gray-600" />
                  <Skeleton className="h-10 w-10 bg-gray-600" />
                </div>
                <Skeleton className="h-10 w-full bg-gray-600" />
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 bg-gray-600" />
                  <Skeleton className="h-6 w-32 bg-gray-600" />
                </div>
                <Skeleton className="h-4 w-48 bg-gray-600" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full bg-gray-600" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Common Issues Guide */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 bg-gray-600" />
              <Skeleton className="h-6 w-64 bg-gray-600" />
            </div>
            <Skeleton className="h-4 w-56 bg-gray-600" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                <Skeleton className="h-5 w-32 bg-gray-600" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-3 w-full bg-gray-600" />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
