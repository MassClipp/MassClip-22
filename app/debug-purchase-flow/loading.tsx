import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Bug } from "lucide-react"

export default function DebugPurchaseFlowLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Bug className="h-10 w-10 text-red-500" />
            Purchase Flow Debugger
          </h1>
          <p className="text-gray-400 text-lg">Loading debugging interface...</p>
        </div>

        {/* Debug Controls Skeleton */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Skeleton className="h-5 w-5 bg-gray-600" />
              <Skeleton className="h-6 w-40 bg-gray-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-gray-600" />
                <Skeleton className="h-10 w-full bg-gray-700" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 bg-gray-600" />
                <Skeleton className="h-10 w-full bg-gray-700" />
              </div>
            </div>
            <Skeleton className="h-10 w-full bg-red-600/20" />
          </CardContent>
        </Card>

        {/* Loading Animation */}
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Initializing debug tools...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
