import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Bug, Activity } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Bug className="h-10 w-10 text-red-500" />
            Comprehensive Purchase Debug
          </h1>
          <p className="text-gray-400 text-lg">
            Advanced debugging tool for purchase verification and bundle content delivery
          </p>
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-6">
          <div className="grid w-full grid-cols-4 gap-2 bg-gray-800 p-1 rounded-lg">
            <Skeleton className="h-10 bg-gray-700" />
            <Skeleton className="h-10 bg-gray-700" />
            <Skeleton className="h-10 bg-gray-700" />
            <Skeleton className="h-10 bg-gray-700" />
          </div>

          {/* Configuration Panel Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Skeleton className="h-5 w-5 bg-gray-600" />
                  <Skeleton className="h-6 w-32 bg-gray-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-gray-600" />
                  <Skeleton className="h-10 w-full bg-gray-700" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16 bg-gray-600" />
                  <Skeleton className="h-10 w-full bg-gray-700" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4 bg-gray-600" />
                  <Skeleton className="h-4 w-24 bg-gray-600" />
                </div>
                <Skeleton className="h-10 w-full bg-red-700" />
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Activity className="h-5 w-5" />
                  <Skeleton className="h-6 w-28 bg-gray-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <Skeleton className="h-8 w-8 mx-auto mb-2 bg-gray-600" />
                    <Skeleton className="h-4 w-12 mx-auto bg-gray-600" />
                  </div>
                  <div className="text-center">
                    <Skeleton className="h-8 w-8 mx-auto mb-2 bg-gray-600" />
                    <Skeleton className="h-4 w-12 mx-auto bg-gray-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20 bg-gray-600" />
                    <Skeleton className="h-4 w-8 bg-gray-600" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16 bg-gray-600" />
                    <Skeleton className="h-4 w-6 bg-gray-600" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-14 bg-gray-600" />
                    <Skeleton className="h-4 w-12 bg-gray-600" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full bg-gray-700" />
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Skeleton className="h-5 w-5 bg-gray-600" />
                  <Skeleton className="h-6 w-24 bg-gray-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full bg-gray-700" />
                <Skeleton className="h-10 w-full bg-gray-700" />
                <Skeleton className="h-10 w-full bg-gray-700" />
              </CardContent>
            </Card>
          </div>

          {/* Data Overview Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-4 bg-gray-600" />
                    <Skeleton className="h-4 w-20 bg-gray-600" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16 bg-gray-600" />
                    <Skeleton className="h-4 w-12 bg-gray-600" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Logs Skeleton */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="h-5 w-5" />
                Loading Debug Interface...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4 bg-gray-600" />
                      <Skeleton className="h-4 w-32 bg-gray-600" />
                      <Skeleton className="h-5 w-16 bg-gray-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-8 bg-gray-600" />
                      <Skeleton className="h-4 w-4 bg-gray-600" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
