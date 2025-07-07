import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DebugCheckoutSessionLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-9 w-32 bg-gray-700" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-gray-700" />
            <Skeleton className="h-4 w-48 bg-gray-700" />
          </div>
        </div>

        {/* Auth Status Card */}
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-gray-700" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-64 bg-gray-700" />
          </CardContent>
        </Card>

        {/* Debug Input Card */}
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardHeader>
            <Skeleton className="h-6 w-56 bg-gray-700" />
            <Skeleton className="h-4 w-80 bg-gray-700" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full bg-gray-700" />
            <Skeleton className="h-10 w-full bg-gray-700" />
          </CardContent>
        </Card>

        {/* Common Issues Card */}
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-gray-700" />
            <Skeleton className="h-4 w-64 bg-gray-700" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-40 bg-gray-700" />
                <Skeleton className="h-4 w-full bg-gray-700" />
                <Skeleton className="h-3 w-3/4 bg-gray-700" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
